
import amqp from 'amqplib';
import cassandra from 'cassandra-driver';

const COLA = 'auditoria.eventos';

const scylla = new cassandra.Client({
  contactPoints: [
    process.env.SCYLLA_HOST || 'scylladb'
  ],
  localDataCenter: 'datacenter1',
  keyspace: 'auditoria'
});

const INSERTAR_EVENTO = `
  INSERT INTO auditoria.logs_eventos (
    fecha_dia,
    tipo_evento,
    timestamp,
    evento_id,
    usuario_id
    jti,
    resultado
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`;

async function iniciarWorker() {
  await scylla.connect();
  console.log('[WORKER] Conectado a ScyllaDB');

  const conexion = await amqp.connect(
    process.env.RABBITMQ_URL
  );

  const canal = await conexion.createChannel();

// ========================================
// RECUPERACIÓN AUTOMÁTICA DEL WORKER
// ========================================

conexion.on('error', (error) => {
  console.error(
    '[WORKER] Error de RabbitMQ:',
    error.message
  );
});

conexion.on('close', () => {
  console.error(
    '[WORKER] Conexión perdida. Docker reiniciará el worker.'
  );

  process.exit(1);
});

canal.on('error', (error) => {
  console.error(
    '[WORKER] Error del canal:',
    error.message
  );
});

canal.on('close', () => {
  console.error('[WORKER] Canal cerrado');
  process.exit(1);
});

  await canal.assertQueue(COLA, {
    durable: true
  });

  await canal.prefetch(50);

  console.log('[WORKER] Escuchando:', COLA);

  await canal.consume(
    COLA,
    async (mensaje) => {
      if (!mensaje) return;

      try {
        const evento = JSON.parse(
          mensaje.content.toString()
        );

        const fecha = new Date(evento.fecha);

        if (
          !evento.tipo_evento ||
          !evento.resultado ||
          Number.isNaN(fecha.getTime())
        ) {
          throw new Error('Evento de auditoría inválido');
        }

        const fechaDia = fecha
          .toISOString()
          .slice(0, 10);

        // Mantener el identificador del evento en cada reentrega.
       // Los mensajes antiguos pueden no tener evento_id.
const eventoId = evento.evento_id
  ? cassandra.types.TimeUuid.fromString(evento.evento_id)
  : cassandra.types.TimeUuid.fromDate(fecha);

        await scylla.execute(
          INSERTAR_EVENTO,
          [
            fechaDia,
            evento.tipo_evento,
            fecha,
            eventoId,
            evento.usuario_id ?? null,
            evento.jti ?? null,
            evento.resultado
          ],
          { prepare: true }
        );

        // Confirmar solamente después de insertar.
        canal.ack(mensaje);

        console.log(
          '[WORKER] Evento guardado:',
          evento.tipo_evento
        );

      } catch (error) {
  console.error(
    '[WORKER] Error procesando evento:',
    error.message
  );

  // Evitar un ciclo inmediato de reintentos
  await new Promise(resolve => setTimeout(resolve, 3000));

  canal.nack(mensaje, false, true);
}
    },
    { noAck: false }
  );
}

iniciarWorker().catch((error) => {
  console.error('[WORKER] Error de inicio:', error.message);
  process.exit(1);
});
