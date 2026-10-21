
import 'dotenv/config';
import { performance } from 'node:perf_hooks';
import { redisClient, conectarRedis } from '../src/infrastructure/database/redis.js';

async function probarLatencia() {
  try {
    await conectarRedis();

    // Preparar una clave para realizar las pruebas
    await redisClient.set('prueba:latencia', 'PAWLYAPP', {
      EX: 120
    });

    // Calentar la conexión
    for (let i = 0; i < 10; i++) {
      await redisClient.get('prueba:latencia');
    }

    const tiempos = [];

    // Realizar 20 lecturas reales
    for (let i = 0; i < 20; i++) {
      const inicio = performance.now();

      await redisClient.get('prueba:latencia');

      const tiempo = performance.now() - inicio;
      tiempos.push(tiempo);

      console.log(
        `Lectura ${i + 1}: ${tiempo.toFixed(3)} ms`
      );
    }

    const promedio =
      tiempos.reduce((a, b) => a + b, 0) / tiempos.length;

    console.log('\nRESULTADOS:');
    console.log(`Mínimo: ${Math.min(...tiempos).toFixed(3)} ms`);
    console.log(`Máximo: ${Math.max(...tiempos).toFixed(3)} ms`);
    console.log(`Promedio: ${promedio.toFixed(3)} ms`);

    await redisClient.del('prueba:latencia');

  } finally {
    await redisClient.quit();
  }
}

probarLatencia().catch(console.error);
