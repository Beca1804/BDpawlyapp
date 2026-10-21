import mongoose from 'mongoose';
import {PerroModel,RegistroMedicoModel,VeterinariaModel} from '../infrastructure/mongoose/index.js';
import {transaccion} from '../infrastructure/database/mongo.js';
import {autorizado,mascotaPropia} from '../security/auth.js';
import {fail} from '../security/errors.js';
import {cachedHistory,invalidateHistory} from './medical-cache.js';
async function veterinaria(id){if(id&&!await VeterinariaModel.exists({_id:id}))fail('Veterinaria no disponible.','NOT_FOUND');}
export const medicalQuery={
 listarRegistrosMedicos:async (_,{perroId,limit=50,offset=0},ctx)=>{
  await mascotaPropia(perroId,ctx);
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)fail('Usa limit entre 1 y 100 y offset no negativo.');
  return cachedHistory(perroId,`${limit}:${offset}`,()=>RegistroMedicoModel.find({perroId}).sort({fechaRegistro:-1,_id:-1}).skip(offset).limit(limit).lean());
 },
 resumenExpedientes:async (_,{perroId},ctx)=>{
  const user=autorizado(ctx);
  const dogs=perroId?[await mascotaPropia(perroId,ctx)]:await PerroModel.find(user.rol==='ADMIN'?{}:{usuarioId:user.id}).select('_id');
  return RegistroMedicoModel.aggregate([
   {$match:{perroId:{$in:dogs.map(d=>new mongoose.Types.ObjectId(d._id))}}},
   {$group:{_id:'$tipoRegistro',cantidad:{$sum:1}}},
   {$project:{_id:0,tipoRegistro:'$_id',cantidad:1}},{$sort:{cantidad:-1,tipoRegistro:1}}
  ]);
 }
};
export const medicalMutation={
 crearRegistroMedico:async (_,{input},ctx)=>{
  await mascotaPropia(input.perroId,ctx);await veterinaria(input.veterinariaId);
  const row=await transaccion(async session=>{const [doc]=await RegistroMedicoModel.create([input],{session});return doc;});
  await invalidateHistory(input.perroId);return row;
 },
 actualizarRegistroMedico:async (_,{id,input},ctx)=>{
  const row=await transaccion(async session=>{
   const doc=await RegistroMedicoModel.findById(id).session(session);if(!doc)fail('Registro no disponible.','NOT_FOUND');
   await mascotaPropia(doc.perroId,ctx);await veterinaria(input.veterinariaId);
   Object.assign(doc,input);await doc.save({session});return doc;
  });
  await invalidateHistory(String(row.perroId));return row;
 },
 eliminarRegistroMedico:async (_,{id},ctx)=>{
  const row=await transaccion(async session=>{
   const doc=await RegistroMedicoModel.findById(id).session(session);if(!doc)fail('Registro no disponible.','NOT_FOUND');
   await mascotaPropia(doc.perroId,ctx);await doc.deleteOne({session});return doc;
  });
  await invalidateHistory(String(row.perroId));return true;
 }
};
