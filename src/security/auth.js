import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomUUID,createHash} from 'node:crypto';
import {RateLimiterMemory} from 'rate-limiter-flexible';
import {UsuarioModel,PerroModel} from '../infrastructure/mongoose/index.js';
import {redisClient,ttl} from '../infrastructure/database/redis.js';
import {fail} from './errors.js';
const version=p=>createHash('sha256').update(p).digest('hex');
const limiter=new RateLimiterMemory({points:20,duration:900});
const dummy=bcrypt.hash('invalid-placeholder',12);
export async function limitarLogin(ip){try{await limiter.consume(ip||'local');}catch{fail('Demasiados intentos. Espera 15 minutos.','RATE_LIMITED');}}
export function autorizado(ctx){if(!ctx.user)fail('Debes iniciar sesión.','UNAUTHENTICATED');return ctx.user;}
export function esAdmin(ctx){return autorizado(ctx).rol==='ADMIN';}
export async function mascotaPropia(id,ctx){
 const user=autorizado(ctx);
 const dog=await PerroModel.findOne({_id:id,...(user.rol==='ADMIN'?{}:{usuarioId:user.id})});
 if(!dog)fail('Mascota no disponible.','FORBIDDEN');return dog;
}
export async function login(_, {correo,password},ctx){
 await limitarLogin(ctx.ip);
 const user=await UsuarioModel.findOne({correo:correo.trim().toLowerCase()}).select('+password');
 const hashed=/^\$2[aby]\$/.test(user?.password||'');
 const valid=Buffer.byteLength(password)<=72&&await bcrypt.compare(password,hashed?user.password:await dummy);
 if(!valid||!hashed||user.estado!=='ACTIVO')fail('Correo o contraseña incorrectos.','UNAUTHENTICATED');
 const jti=randomUUID(),seconds=ttl('SESSION_TTL',3600);
 const token=jwt.sign({version:version(user.password)},process.env.JWT_SECRET,{subject:user.id,jwtid:jti,expiresIn:seconds,algorithm:'HS256',issuer:'bdpawlyapp',audience:'pawly'});
 await redisClient.set(`sesion:${jti}`,user.id,{EX:seconds});return {token,usuario:user};
}
export async function logout(_,args,ctx){autorizado(ctx);await redisClient.del(`sesion:${ctx.jti}`);return true;}
export async function contexto(req){
 const ctx={user:null,ip:req.ip};const header=req.headers.authorization;if(!header)return ctx;
 const match=/^Bearer\s+(\S+)$/i.exec(header);if(!match)fail('Token inválido.','UNAUTHENTICATED');
 let payload;try{payload=jwt.verify(match[1],process.env.JWT_SECRET,{algorithms:['HS256'],issuer:'bdpawlyapp',audience:'pawly'});}catch{fail('Token inválido o vencido.','UNAUTHENTICATED');}
 if(typeof payload.sub!=='string'||!/^[a-f0-9]{24}$/i.test(payload.sub)||typeof payload.jti!=='string'||!/^[a-f0-9-]{36}$/i.test(payload.jti))fail('Token inválido.','UNAUTHENTICATED');
 let active;try{active=await redisClient.get(`sesion:${payload.jti}`);}catch{fail('No se puede verificar la sesión.','SERVICE_UNAVAILABLE');}
 if(active!==payload.sub)fail('Sesión cerrada o vencida.','UNAUTHENTICATED');
 const user=await UsuarioModel.findById(payload.sub).select('+password');
 if(!user||user.estado!=='ACTIVO'||payload.version!==version(user.password))fail('Cuenta o sesión inválida.','UNAUTHENTICATED');
 ctx.user={id:user.id,rol:user.rol};ctx.jti=payload.jti;return ctx;
}
