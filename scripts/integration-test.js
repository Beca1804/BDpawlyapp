// Desarrollo: servidor aislado, datos temporales, limpieza al terminar.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as M from '../src/infrastructure/mongoose/index.js';
import {conectarMongo,cerrarMongo,transaccion} from '../src/infrastructure/database/mongo.js';
import {conectarRedis,cerrarRedis,redisClient} from '../src/infrastructure/database/redis.js';
import {keysKey,versionKey} from '../src/services/medical-cache.js';
const tag=Date.now(),sessions=[],created=[];
let server,exit,output='';
const password='Local-test-password!';
async function req(query,variables={},token,expected) {
 const response=await fetch('http://127.0.0.1:4001/',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(10000)});
 const body=await response.json();
 if(expected){assert.equal(body.errors?.[0]?.extensions?.code,expected,JSON.stringify(body));if(expected==='UNAUTHENTICATED')assert.equal(response.status,401);assert.ok(!JSON.stringify(body).includes('stacktrace'));return;}
 assert.ok(!body.errors,JSON.stringify(body));return body.data;
}
async function record(model,values){const row=await model.create(values);created.push([model,row._id]);return row;}
async function login(correo){const data=await req('mutation($c:String!,$p:String!){login(correo:$c,password:$p){token usuario{id}}}',{c:correo,p:password});const token=data.login.token;sessions.push(jwt.decode(token).jti);return token;}
async function add(name,type,input,token,model,fields='id') {
 const data=await req(`mutation($input:${type}!){${name}(input:$input){${fields}}}`,{input},token);
 const row=data[name];created.push([model,row.id]);return row;
}
try {
 await Promise.all([conectarMongo(),conectarRedis()]);
 const admin=await record(M.UsuarioModel,{nombre:'Admin temporal',correo:`admin-${tag}@example.invalid`,password,rol:'ADMIN'});
 server=spawn(process.execPath,['src/index.js'],{env:{...process.env,PORT:'4001'},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>{output+=d;});server.stderr.on('data',d=>{output+=d;});exit=once(server,'exit');
 for(let i=0;i<150&&!output.includes('Pawly API lista');i++){if(server.exitCode!==null)throw Error(output);await delay(100);}
 assert.ok(output.includes('Pawly API lista'),output);
 const adminToken=await login(admin.correo);
 const owner=await add('crearUsuario','CrearUsuarioInput',{nombre:'Dueño temporal',correo:`owner-${tag}@example.invalid`,password},undefined,M.UsuarioModel);
 const other=await add('crearUsuario','CrearUsuarioInput',{nombre:'Otro temporal',correo:`other-${tag}@example.invalid`,password},undefined,M.UsuarioModel);
 const token=await login(`owner-${tag}@example.invalid`),outsider=await login(`other-${tag}@example.invalid`);
 const stored=await M.UsuarioModel.findById(owner.id).select('+password');assert.ok(await bcrypt.compare(password,stored.password));assert.notEqual(stored.password,password);
 await req('{me{id}}',{},undefined,'UNAUTHENTICATED');await req('{me{id}}',{},'invalid','UNAUTHENTICATED');
 const fake=jwt.sign({sub:owner.id,jti:sessions.at(-1)},'wrong-secret');await req('{me{id}}',{},fake,'UNAUTHENTICATED');
 await req('{me{password}}',{},token,'GRAPHQL_VALIDATION_FAILED');
 await req('mutation($input:CrearUsuarioInput!){crearUsuario(input:$input){id}}',{input:{nombre:'Duplicado',correo:stored.correo,password}},undefined,'CONFLICT');
 const breedInput={nombre:`Raza-${tag}`,tamanoPromedio:'MEDIANO',esperanzaVidaMin:10,esperanzaVidaMax:15};
 await req('mutation($input:CrearRazaInput!){crearRaza(input:$input){id}}',{input:breedInput},token,'FORBIDDEN');
 const raza=await add('crearRaza','CrearRazaInput',breedInput,adminToken,M.RazaModel);
 const vet=await add('crearVeterinaria','CrearVeterinariaInput',{nombre:'Veterinaria test',direccion:'Test',telefono:'123'},adminToken,M.VeterinariaModel);
 const dogInput={usuarioId:owner.id,razaId:raza.id,nombre:'Luna test',sexo:'HEMBRA',fechaNacimiento:'2023-01-15',peso:12,tamano:'MEDIANO'};
 const dog=await add('crearPerro','CrearPerroInput',dogInput,token,M.PerroModel,'id fechaNacimiento');assert.equal(dog.fechaNacimiento,'2023-01-15T00:00:00.000Z');
 const dog2=await add('crearPerro','CrearPerroInput',{...dogInput,nombre:'Max test'},token,M.PerroModel);
 await req('query($id:ID!){obtenerPerro(id:$id){id}}',{id:dog.id},outsider,'FORBIDDEN');
 assert.equal((await req('{listarPerros{id}}',{},outsider)).listarPerros.length,0);
 await req('mutation($input:CrearPerroInput!){crearPerro(input:$input){id}}',{input:dogInput},outsider,'FORBIDDEN');
 await req('query($id:ID!){obtenerPerro(id:$id){id}}',{id:'bad'},token,'BAD_USER_INPUT');
 const activity=await add('registrarActividad','RegistrarActividadInput',{perroId:dog.id,fecha:'2025-01-01',pasos:200,metaPasos:100},token,M.RegistroActividadModel,'id metaCumplida');assert.equal(activity.metaCumplida,true);
 await add('crearCitaVeterinaria','CrearCitaVeterinariaInput',{perroId:dog.id,veterinariaId:vet.id,fechaHora:'2027-01-01T12:00:00Z',motivo:'Prueba'},token,M.CitaVeterinariaModel);
 await add('crearPublicacion','CrearPublicacionInput',{perroId:dog.id,usuarioId:owner.id,descripcion:'Prueba'},token,M.PublicacionModel);
 await req('mutation($id:ID!){agregarVacuna(perroId:$id,input:{nombre:"Prueba",fechaAplicacion:"2025-01-01"}){id cartilla{vacunas{id fechaAplicacion}}}}',{id:dog.id},token);
 for(const name of ['listarActividadPorPerro','listarCitasPorPerro'])await req(`query($id:ID!){${name}(perroId:$id){id}}`,{id:dog.id},outsider,'FORBIDDEN');
 const query='query($id:ID!){listarRegistrosMedicos(perroId:$id){id tipoRegistro descripcion fechaRegistro}}';
 const read=id=>req(query,{id},token);
 const med=await add('crearRegistroMedico','CrearRegistroMedicoInput',{perroId:dog.id,tipoRegistro:'CONSULTA',descripcion:'Prueba'},token,M.RegistroMedicoModel,'id fechaRegistro');assert.match(med.fechaRegistro,/T/);
 const first=await read(dog.id);assert.deepEqual(await read(dog.id),first);
 const keys=await redisClient.sMembers(keysKey(dog.id));assert.ok(keys.length);assert.ok(await redisClient.ttl(keys[0])>0);
 await req(query,{id:dog.id},outsider,'FORBIDDEN');
 await read(dog2.id);const otherKeys=await redisClient.sMembers(keysKey(dog2.id));
 const extra=await add('crearRegistroMedico','CrearRegistroMedicoInput',{perroId:dog.id,tipoRegistro:'TRATAMIENTO',descripcion:'Prueba extra'},token,M.RegistroMedicoModel);
 for(const key of keys)assert.equal(await redisClient.exists(key),0);
 assert.equal(await redisClient.exists(otherKeys[0]),1);assert.equal((await read(dog.id)).listarRegistrosMedicos.length,2);
 await req('mutation($id:ID!){actualizarRegistroMedico(id:$id,input:{descripcion:"No"}){id}}',{id:med.id},outsider,'FORBIDDEN');
 await req('mutation($id:ID!){actualizarRegistroMedico(id:$id,input:{descripcion:"Actualizado"}){id}}',{id:med.id},token);
 assert.ok((await read(dog.id)).listarRegistrosMedicos.some(r=>r.descripcion==='Actualizado'));
 const summary=await req('query($id:ID!){resumenExpedientes(perroId:$id){tipoRegistro cantidad}}',{id:dog.id},token);assert.equal(summary.resumenExpedientes.reduce((a,r)=>a+r.cantidad,0),2);
 await req('mutation($id:ID!){eliminarRegistroMedico(id:$id)}',{id:extra.id},outsider,'FORBIDDEN');
 await req('mutation($id:ID!){eliminarRegistroMedico(id:$id)}',{id:extra.id},token);assert.equal((await read(dog.id)).listarRegistrosMedicos.length,1);
 for(let i=0;i<5;i++)await read(dog.id);
 for(const key of await redisClient.sMembers(keysKey(dog.id)))await redisClient.expire(key,1);
 await delay(1100);await read(dog.id);
 // Multi-document rollback uses two model writes, neither may survive.
 await assert.rejects(transaccion(async session=>{
  await M.RegistroMedicoModel.create([{perroId:dog.id,tipoRegistro:'OTRO',descripcion:`rollback-${tag}`}],{session});
  await M.RegistroActividadModel.create([{perroId:dog.id,pasos:1,fecha:new Date()}],{session});
  throw Error('rollback');
 }),/rollback/);
 assert.equal(await M.RegistroMedicoModel.countDocuments({descripcion:`rollback-${tag}`}),0);
 assert.equal(await M.RegistroActividadModel.countDocuments({perroId:dog.id}),1);
 const jti=jwt.decode(token).jti;assert.equal(await redisClient.get(`sesion:${jti}`),owner.id);assert.ok(await redisClient.ttl(`sesion:${jti}`)>0);
 const second=await login(stored.correo);
 assert.equal((await req('mutation{logout}',{},token)).logout,true);assert.equal(await redisClient.exists(`sesion:${jti}`),0);
 await req('{me{id}}',{},token,'UNAUTHENTICATED');await req('{me{id}}',{},second);
 await redisClient.expire(`sesion:${jwt.decode(second).jti}`,1);await delay(1100);await req('{me{id}}',{},second,'UNAUTHENTICATED');
 const revokedAccount=await login(stored.correo);await M.UsuarioModel.updateOne({_id:owner.id},{$set:{estado:'INACTIVO'}});await req('{me{id}}',{},revokedAccount,'UNAUTHENTICATED');
 const readings=output.split('\n').filter(s=>s.startsWith('{')).map(s=>{try{return JSON.parse(s);}catch{return {};}}).filter(r=>r.evento==='expediente_lectura');
 const hits=readings.filter(r=>r.fuente==='Redis').map(r=>r.ms);assert.ok(hits.length>=6);assert.ok(readings.some(r=>r.fuente==='MongoDB'));
 const evidence={timestamp:new Date().toISOString(),tests:'passed',redisSamples:hits,allRedisBelow1_5ms:hits.every(n=>n<1.5),measurements:readings};
 console.log('EVIDENCIA '+JSON.stringify(evidence));if(process.env.INTEGRATION_REPORT_PATH)fs.writeFileSync(process.env.INTEGRATION_REPORT_PATH,JSON.stringify(evidence,null,2)+'\n');
 console.log('OK: modelos y operaciones originales, contraseñas cifradas, permisos, caché e invalidación CRUD, agregación, rollback, sesiones, expiración y revocación HTTP 401.');
}catch(e){console.error(e);process.exitCode=1;}
finally {
 if(server&&server.exitCode===null){server.kill('SIGTERM');await exit;}
 for(const [model,id] of created.reverse()) {
  if(model===M.PerroModel){const keys=await redisClient.sMembers(keysKey(String(id)));if(keys.length)await redisClient.del(keys);await redisClient.del([keysKey(String(id)),versionKey(String(id))]);}
  await model.deleteOne({_id:id});
 }
 if(sessions.length)await redisClient.del(sessions.map(jti=>`sesion:${jti}`));
 await Promise.allSettled([cerrarMongo(),cerrarRedis()]);
}
