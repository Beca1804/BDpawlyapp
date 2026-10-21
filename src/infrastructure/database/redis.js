import {createClient} from 'redis';
export const redisClient=createClient({url:process.env.REDIS_URL,password:process.env.REDIS_PASSWORD,
 socket:{connectTimeout:5000,reconnectStrategy:retries=>Math.min(retries*100,2000)},disableOfflineQueue:true});
redisClient.on('error',()=>console.error('Redis no está disponible.'));
export function ttl(name,fallback) {const n=Number(process.env[name]||fallback);if(!Number.isInteger(n)||n<1||n>86400)throw Error(`TTL inválido: ${name}`);return n;}
export const conectarRedis=()=>redisClient.connect();
export const cerrarRedis=async()=>{if(redisClient.isOpen)await redisClient.quit();};
