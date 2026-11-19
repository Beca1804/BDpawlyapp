import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import amqp from 'amqplib';
import {conectarRabbitMQ,publicarEventoAuditoria,cerrarRabbitMQ} from '../src/infrastructure/messaging/rabbitmq.js';

test('una confirmación detenida no bloquea el login y el canal se recupera',async()=>{
 const original=amqp.connect;const oldUrl=process.env.RABBITMQ_URL;
 const connection=new EventEmitter(),channel=new EventEmitter();let detener=false;let payload;
 channel.assertQueue=async()=>{};
 channel.sendToQueue=(_queue,buffer,_options,confirm)=>{payload=JSON.parse(buffer.toString());if(!detener)confirm(null);return true;};
 channel.close=async()=>channel.emit('close');connection.close=async()=>connection.emit('close');
 connection.createConfirmChannel=async()=>channel;
 amqp.connect=async()=>connection;process.env.RABBITMQ_URL='amqp://local';
 const keepAlive=setInterval(()=>{},1000);
 try{
  assert.equal(await conectarRabbitMQ(),true);
  const evento={tipo_evento:'LOGIN_EXITOSO',usuario_id:'0123456789abcdef01234567',jti:randomUUID(),resultado:'EXITO',password:'no-publicar'};
  assert.equal(await publicarEventoAuditoria(evento),true);assert.ok(!('password' in payload));
  detener=true;const start=Date.now();assert.equal(await publicarEventoAuditoria(evento),false);assert.ok(Date.now()-start<2200);
  detener=false;assert.equal(await conectarRabbitMQ(),true);assert.equal(await publicarEventoAuditoria(evento),true);
 }finally{await cerrarRabbitMQ();clearInterval(keepAlive);amqp.connect=original;if(oldUrl===undefined)delete process.env.RABBITMQ_URL;else process.env.RABBITMQ_URL=oldUrl;}
});
