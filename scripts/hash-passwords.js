import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {conectarMongo,cerrarMongo} from '../src/infrastructure/database/mongo.js';
import {UsuarioModel} from '../src/infrastructure/mongoose/index.js';
try {
 await conectarMongo();let count=0;
 for(const user of await UsuarioModel.find().select('+password')) {
  if(/^\$2[aby]\$\d{2}\$/.test(user.password))continue;
  if(Buffer.byteLength(user.password)>72)throw Error('Hay una contraseña antigua mayor de 72 bytes; restablécela antes de migrar.');
  const password=await bcrypt.hash(user.password,12);
  // Escritura controlada: evitar que el hook vuelva a cifrar el hash.
  await UsuarioModel.collection.updateOne({_id:user._id,password:user.password},{$set:{password}});count++;
 }
 console.log(`Contraseñas convertidas: ${count}`);
}catch(e){console.error(e.message);process.exitCode=1;}finally{await cerrarMongo();}
