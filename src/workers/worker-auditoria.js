import 'dotenv/config';
import amqp from 'amqplib';
import cassandra from 'cassandra-driver';
import { validarEventoAuditoria } from '../infrastructure/messaging/evento-auditoria.js';

const scylla = new cassandra.Client({
  contactPoints: [process.env.SCYLLA_HOST || 'scylladb'],
  localDataCenter: 'datacenter1', keyspace: 'auditoria'
});
const INSERTAR_EVENTO = `INSERT INTO auditoria.logs_eventos
  (fecha_dia, tipo_evento, timestamp, evento_id, usuario_id, jti, resultado)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;
let conexion, canal;
let cerrando = false;

async function iniciarWorker() {
  await scylla.connect();
  conexion = await amqp.connect(process.env.RABBITMQ_URL, {timeout:5000});
  conexion.on('error', () => console.error('[WORKER] Conexión AMQP interrumpida'));
  conexion.on('close', () => { if (!cerrando) process.exit(1); });
  canal = await conexion.createChannel();
  canal.on('error', () => console.error('[WORKER] Error del canal AMQP'));
  canal.on('close', () => { if (!cerrando) process.exit(1); });
  await canal.assertQueue('auditoria.eventos', {durable:true});
  await canal.prefetch(50);
  await canal.consume('auditoria.eventos', async mensaje => {
    if (!mensaje) return;
    let evento;
    try {
      evento = JSON.parse(mensaje.content.toString());
      validarEventoAuditoria(evento);
    } catch {
      console.error('[WORKER] Evento inválido rechazado');
      canal.nack(mensaje, false, false);
      return;
    }
    try {
      const fecha = new Date(evento.fecha);
      await scylla.execute(INSERTAR_EVENTO, [
        cassandra.types.LocalDate.fromString(fecha.toISOString().slice(0,10)),
        evento.tipo_evento,fecha,cassandra.types.TimeUuid.fromString(evento.evento_id),
        evento.usuario_id,evento.jti,evento.resultado
      ], {prepare:true, consistency:cassandra.types.consistencies.localQuorum, isIdempotent:true});
      canal.ack(mensaje);
      console.log('[WORKER] Evento persistido', evento.evento_id);
    } catch {
      console.error('[WORKER] Escritura no confirmada; se reintentará');
      await new Promise(resolve => setTimeout(resolve,3000));
      if (!cerrando) canal.nack(mensaje,false,true);
    }
  }, {noAck:false});
  console.log('[WORKER] Consumiendo auditoria.eventos con prefetch 50');
}
async function cerrar() {
  cerrando=true;
  try { await canal?.close();await conexion?.close();await scylla.shutdown(); } finally {process.exit(0);}
}
process.on('SIGTERM',cerrar);process.on('SIGINT',cerrar);
iniciarWorker().catch(()=>{console.error('[WORKER] Inicio pendiente; se reintentará al reiniciar');process.exit(1);});
