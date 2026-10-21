import mongoose from 'mongoose';
import * as models from '../mongoose/index.js';
mongoose.set('bufferCommands',false);
export async function conectarMongo() {
 await mongoose.connect(process.env.MONGO_URI,{user:process.env.MONGO_USER,pass:process.env.MONGO_PASSWORD,authSource:process.env.MONGO_AUTH_SOURCE||'pawly',serverSelectionTimeoutMS:15000});
 for(const model of Object.values(models)){await model.createCollection();await model.createIndexes();}
 const hello=await mongoose.connection.db.admin().command({hello:1});
 if(!hello.setName)throw Error('Configura MongoDB como replica set; Compose lo prepara con mongo-setup.');
}
export const cerrarMongo=()=>mongoose.disconnect();
export async function transaccion(fn){const session=await mongoose.startSession();try{return await session.withTransaction(()=>fn(session));}finally{await session.endSession();}}
