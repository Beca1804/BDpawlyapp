import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { crearEventoAuditoria, validarEventoAuditoria } from '../src/infrastructure/messaging/evento-auditoria.js';
const input=()=>({tipo_evento:'LOGIN_EXITOSO',usuario_id:'0123456789abcdef01234567',jti:randomUUID(),resultado:'EXITO'});
test('solo los campos permitidos llegan al payload',()=>{
  const event=crearEventoAuditoria({...input(),password:'secreto',hash:'hash',token:'jwt.completo.firma'});
  assert.deepEqual(Object.keys(event).sort(),['evento_id','tipo_evento','usuario_id','jti','resultado','fecha'].sort());
  assert.doesNotThrow(()=>validarEventoAuditoria(event));
});
test('identificadores distintos y fecha estable en reentregas',()=>{
  const event=crearEventoAuditoria(input());const copy=JSON.parse(JSON.stringify(event));
  validarEventoAuditoria(copy);assert.equal(copy.evento_id,event.evento_id);assert.equal(copy.fecha,event.fecha);
  assert.notEqual(event.evento_id,crearEventoAuditoria(input()).evento_id);
});
test('no admite JWT ni contraseña en campos de identificadores',()=>{
  assert.throws(()=>crearEventoAuditoria({...input(),jti:'eyJhbGciOiJ.eyJzdWIiOiJ.firma'}));
  assert.throws(()=>crearEventoAuditoria({...input(),usuario_id:'una contraseña'}));
  assert.throws(()=>crearEventoAuditoria({...input(),resultado:'token secreto'}));
});
test('rechaza fechas y evento_id inválidos antes de insertar',()=>{
 const event=crearEventoAuditoria(input());
 assert.throws(()=>validarEventoAuditoria({...event,fecha:'ayer'}));
 assert.throws(()=>validarEventoAuditoria({...event,evento_id:randomUUID()}));
});
