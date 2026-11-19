import 'dotenv/config';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import { UsuarioModel, RazaModel } from '../src/infrastructure/mongoose/index.js';
const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD));
const session = driver.session();
try {
  await mongoose.connect(process.env.MONGO_URI);
  await driver.verifyConnectivity();
  const cypher = await fs.readFile(new URL('./init/init-rbac.cql',import.meta.url),'utf8');
  for (const statement of cypher.split(';').map(s=>s.trim()).filter(Boolean)) await session.run(statement);
  // Vincular cuentas existentes sin reemplazar sus roles previamente asignados.
  for (const user of await UsuarioModel.find()) {
    await session.run(`MERGE (u:User {id:$id}) SET u.email=$email
      WITH u WHERE NOT EXISTS { MATCH (u)-[:HAS_ROLE]->(:Role) }
      MATCH (r:Role {name:$role}) MERGE (u)-[:HAS_ROLE]->(r)`,
    {id:String(user._id),email:user.correo,role:user.rol==='ADMIN'?'ADMIN':'TUTOR'});
  }
  if (process.env.DEMO_PASSWORD) {
    for (const [role,email] of [['TUTOR','tutor@pawly.local'],['ADMIN','admin@pawly.local'],['SUPER_ADMIN','superadmin@pawly.local']]) {
      let user = await UsuarioModel.findOne({correo:email});
      if (!user) user = new UsuarioModel({nombre:`Demo ${role}`,correo:email,password:process.env.DEMO_PASSWORD,rol:role==='TUTOR'?'USUARIO':'ADMIN',estado:'ACTIVO'});
      else user.password=process.env.DEMO_PASSWORD;
      await user.save();
      await session.run(`MERGE (u:User {id:$id}) SET u.email=$email
        WITH u OPTIONAL MATCH (u)-[old:HAS_ROLE]->(:Role) DELETE old
        WITH DISTINCT u MATCH (r:Role {name:$role}) MERGE (u)-[:HAS_ROLE]->(r)`,{id:String(user._id),email,role});
    }
    if (!await RazaModel.exists({nombre:'Mestizo demo'})) await RazaModel.create({nombre:'Mestizo demo',tamanoPromedio:'MEDIANO',esperanzaVidaMin:10,esperanzaVidaMax:16});
  }
  console.log('Catálogo RBAC y usuarios preparados.');
} finally { await session.close();await driver.close();await mongoose.disconnect(); }
