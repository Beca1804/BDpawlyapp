
import { createClient } from 'redis';

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    noDelay: true
  },
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (error) => {
  console.error('Error de Redis:', error.message);
});

export async function conectarRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log('Redis conectado correctamente');
}
