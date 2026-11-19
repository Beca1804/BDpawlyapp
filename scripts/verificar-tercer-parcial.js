import 'dotenv/config';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import cassandra from 'cassandra-driver';
import neo4j from 'neo4j-driver';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
const mode=process.argv[2]||'core';
const api=process.env.API_URL||'http://api:4000/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(query,variables={},token){
 const r=await fetch(api,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(10000)});
 return {status:r.status,...await r.json()};
}
async function login(role){const r=await gql('mutation($correo:String!,$password:String!){login(correo:$correo,password:$password){token usuario{id}}}',{correo:`${role}@pawly.local`,password:process.env.DEMO_PASSWORD});assert.ok(r.data?.login?.token,JSON.stringify(r.errors));return r.data.login;}
async function broker(path,body){const u=new URL(process.env.RABBITMQ_URL);const r=await fetch(`http://rabbitmq:15672/api/${path}`,{method:body?'POST':'GET',headers:{authorization:'Basic '+Buffer.from(decodeURIComponent(u.username)+':'+decodeURIComponent(u.password)).toString('base64'),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});assert.ok(r.ok,`RabbitMQ HTTP ${r.status}`);return r.json();}
async function menu(token){const r=await gql('{miMenu{id title parentId path}}',{},token);assert.ok(!r.errors);return r.data.miMenu;}
if(mode==='preparar-offline'){
 const session=await login('tutor');
 await fs.writeFile('/estado/sesion-prueba.json',JSON.stringify(session),{mode:0o600});
 console.log('Sesión previa preparada sin exponer el token');
}else if(mode==='offline'){
 const previous=JSON.parse(await fs.readFile('/estado/sesion-prueba.json','utf8'));
 assert.ok(!(await gql('{me{id}}',{},previous.token)).errors, 'La sesión previa debe seguir activa');
 await fs.unlink('/estado/sesion-prueba.json');
 const start=Date.now();const {token}=await login('tutor');assert.equal((await gql('{me{id}}',{},token)).status,200);assert.ok(!(await gql('{listarPerros{id nombre}}',{},token)).errors);assert.ok(!(await gql('{listarRazas{id nombre}}')).errors);assert.ok(Date.now()-start<6000);console.log('6 OK Sesión previa, login nuevo y consultas con RabbitMQ apagado');
}else if(mode==='cola'){
 await login('tutor');const items=await broker('queues/%2F/auditoria.eventos/get',{count:20,ackmode:'ack_requeue_true',encoding:'auto'});assert.ok(items.length>0);
 for(const msg of items){const event=JSON.parse(msg.payload);assert.deepEqual(Object.keys(event).sort(),['evento_id','tipo_evento','usuario_id','jti','resultado','fecha'].sort());assert.equal(msg.properties.delivery_mode,2);assert.ok(!/password|hash|eyJhbGci/i.test(msg.payload));}
 console.log('4 OK Cola durable y payload persistente sin credenciales; mensajes reencolados para inspección');
}else{
 const driver=neo4j.driver(process.env.NEO4J_URI,neo4j.auth.basic(process.env.NEO4J_USER||'neo4j',process.env.NEO4J_PASSWORD));const s=driver.session();const scylla=new cassandra.Client({contactPoints:[process.env.SCYLLA_HOST||'scylladb'],localDataCenter:'datacenter1',keyspace:'auditoria'});
 try{
  await mongoose.connect(process.env.MONGO_URI);await scylla.connect();
  const constraints=await s.run('SHOW CONSTRAINTS YIELD type,labelsOrTypes,properties RETURN type,labelsOrTypes,properties');
  for(const [label,properties] of [['User',['id']],['Role',['name']],['Route',['path','method','operation']],['MenuNode',['id']]]) assert.ok(constraints.records.some(r=>r.get('type')==='UNIQUENESS'&&r.get('labelsOrTypes').includes(label)&&JSON.stringify(r.get('properties'))===JSON.stringify(properties)), 'Restricción activa para '+label);
  for(const rel of ['HAS_ROLE','INHERITS','CAN_ACCESS','CAN_VIEW_MENU','NAVIGATES_TO','HAS_CHILD']){
   const q=await s.run(`MATCH ()-[r:${rel}]->() RETURN count(r) AS n`);assert.ok(q.records[0].get('n').toNumber()>0);
  }
  assert.equal((await s.run('MATCH (r:Role)-[:INHERITS*1..]->(r) RETURN count(*) AS n')).records[0].get('n').toNumber(),0);
  console.log('1 OK Grafo y restricciones únicas activas');
  const tutor=await login('tutor'),admin=await login('admin'),superadmin=await login('superadmin');
  const mutation='mutation($input:CrearRazaInput!){crearRaza(input:$input){id nombre}}';const input={nombre:'Defensa '+randomUUID(),tamanoPromedio:'MEDIANO',esperanzaVidaMin:10,esperanzaVidaMax:15};
  const denied=await gql(mutation,{input},tutor.token);assert.equal(denied.status,403);assert.equal(denied.errors[0].extensions.code,'FORBIDDEN');assert.equal(await mongoose.connection.collection('razas').countDocuments({nombre:input.nombre}),0);
  for(const [role,user] of [['directo',admin],['heredado',superadmin]]){const r=await gql(mutation,{input:{...input,nombre:input.nombre+' '+role}},user.token);assert.ok(r.data?.crearRaza?.id,JSON.stringify(r.errors));}
  const direct=await s.run("MATCH (:Role {name:'SUPER_ADMIN'})-[:CAN_ACCESS]->(r:Route {operation:'crearRaza'}) RETURN count(r) AS n");assert.equal(direct.records[0].get('n').toNumber(),0);
  console.log('2 OK 403 sin escritura, acceso directo y éxito por herencia');
  const tm=await menu(tutor.token),am=await menu(admin.token),sm=await menu(superadmin.token);
  assert.ok(!tm.some(i=>i.id==='USUARIOS'||i.id==='ADMINISTRACION'));assert.ok(am.some(i=>i.id==='USUARIOS'));assert.ok(sm.some(i=>i.id==='USUARIOS'));
  for(const list of [tm,am,sm]){assert.equal(new Set(list.map(i=>i.id)).size,list.length);for(const item of list)if(item.parentId)assert.ok(list.some(i=>i.id===item.parentId));}
  console.log('3 OK Menú filtrado, jerárquico y sin duplicados');
  const vet=await gql('mutation($input:CrearVeterinariaInput!){crearVeterinaria(input:$input){id nombre}}',{input:{nombre:'Veterinaria defensa '+randomUUID(),direccion:'Dirección de prueba',telefono:'0000000000'}},admin.token);assert.ok(vet.data?.crearVeterinaria?.id,JSON.stringify(vet.errors));
  const jwt=JSON.parse(Buffer.from(tutor.token.split('.')[1],'base64url').toString());let found=false;
  for(let i=0;i<30;i++){const r=await scylla.execute('SELECT * FROM auditoria.logs_eventos WHERE fecha_dia=? AND tipo_evento=?',[new Date().toISOString().slice(0,10),'LOGIN_EXITOSO'],{prepare:true});if(r.rows.some(x=>x.jti===jwt.jti)){found=true;break;}await delay(1000);}
  assert.ok(found,'El evento de este login debe existir en ScyllaDB');
  const schema=await scylla.execute("SELECT column_name,kind,position,clustering_order FROM system_schema.columns WHERE keyspace_name='auditoria' AND table_name='logs_eventos'");
  for(const [name,kind,pos,order] of [['fecha_dia','partition_key',0,null],['tipo_evento','partition_key',1,null],['timestamp','clustering',0,'desc'],['evento_id','clustering',1,'desc']]){const c=schema.rows.find(x=>x.column_name===name);assert.equal(c.kind,kind);assert.equal(c.position,pos);if(order)assert.equal(c.clustering_order.toLowerCase(),order);}
  let empty=false;for(let i=0;i<30;i++){const q=await broker('queues/%2F/auditoria.eventos');if(q.messages_ready===0&&q.messages_unacknowledged===0){empty=true;break;}await delay(1000);}assert.ok(empty);
  const sync=await scylla.execute("SELECT value FROM system.config WHERE name='commitlog_sync'");assert.equal(JSON.parse(sync.rows[0].value),'batch');
  console.log('5 OK Eventos persistidos, claves y orden descendente, cola sin pendientes');
 }finally{await s.close();await driver.close();await scylla.shutdown();await mongoose.disconnect();}
}
