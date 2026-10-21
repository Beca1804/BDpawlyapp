import 'dotenv/config';
import {randomBytes} from 'node:crypto';
import {conectarMongo,cerrarMongo,transaccion} from '../src/infrastructure/database/mongo.js';
import {UsuarioModel,RazaModel,PerroModel,RegistroMedicoModel} from '../src/infrastructure/mongoose/index.js';
try {
 await conectarMongo();
 const correo='demo.parcial2@pawly.example';
 const password=randomBytes(18).toString('hex')+'!';
 const result=await transaccion(async session=>{
  if(await UsuarioModel.findOne({correo}).session(session))return null;
  const [user]=await UsuarioModel.create([{nombre:'Ana Demo',correo,password}],{session});
  let raza=await RazaModel.findOne({nombre:'Mestizo demo parcial 2'}).session(session);
  if(!raza)[raza]=await RazaModel.create([{nombre:'Mestizo demo parcial 2',tamanoPromedio:'MEDIANO',esperanzaVidaMin:10,esperanzaVidaMax:15}],{session});
  const mascotas=[];
  for(const nombre of ['Luna','Max']) {
   const [dog]=await PerroModel.create([{usuarioId:user._id,razaId:raza._id,nombre,sexo:nombre==='Luna'?'HEMBRA':'MACHO',fechaNacimiento:'2023-01-15',peso:12,tamano:'MEDIANO'}],{session});
   mascotas.push({id:dog.id,nombre});
   for(const tipoRegistro of ['CONSULTA','TRATAMIENTO',...(nombre==='Luna'?['CONSULTA']:[])])await RegistroMedicoModel.create([{perroId:dog._id,tipoRegistro,descripcion:`Ejemplo académico de ${tipoRegistro.toLowerCase()} para ${nombre}.`}],{session});
  }
  return {correo,password,usuarioId:user.id,mascotas};
 });
 console.log(result?JSON.stringify(result,null,2):'La cuenta demo ya existe; no se modificaron sus datos ni contraseña.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await cerrarMongo();}
