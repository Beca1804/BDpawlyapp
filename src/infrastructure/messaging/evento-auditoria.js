import cassandra from 'cassandra-driver';

export function crearEventoAuditoria(evento) {
  const mensaje = {
    evento_id: cassandra.types.TimeUuid.now().toString(),
    tipo_evento: evento.tipo_evento,
    usuario_id: evento.usuario_id ?? null,
    jti: evento.jti ?? null,
    resultado: evento.resultado,
    fecha: new Date().toISOString()
  };
  validarEventoAuditoria(mensaje);
  return mensaje;
}

export function validarEventoAuditoria(evento) {
  if (!evento || typeof evento !== 'object' ||
      !/^[A-Z_]{3,50}$/.test(evento.tipo_evento || '') ||
      !['EXITO','ERROR','DENEGADO'].includes(evento.resultado) ||
      !Number.isFinite(Date.parse(evento.fecha)) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evento.evento_id || '') ||
      (evento.usuario_id !== null && !/^[0-9a-f]{24}$/i.test(evento.usuario_id || '')) ||
      (evento.jti !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evento.jti || ''))) {
    throw new Error('Evento de auditoría inválido');
  }
}
