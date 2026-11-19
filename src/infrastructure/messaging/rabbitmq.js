
import amqp from 'amqplib';
import { crearEventoAuditoria } from './evento-auditoria.js';

const COLA_AUDITORIA = 'auditoria.eventos';
const REINTENTO_MS = 5000;

let conexion = null;
let canal = null;
let conectando = null;
let temporizador = null;
let cerrando = false;

// ========================================
// RECONEXIÓN AUTOMÁTICA
// ========================================

function programarReconexion() {
  if (cerrando || temporizador) return;

  console.log('[RABBITMQ] Reintentando conexión...');

  temporizador = setTimeout(() => {
    temporizador = null;
    void conectarRabbitMQ();
  }, REINTENTO_MS);
}

// ========================================
// CONEXIÓN
// ========================================

export async function conectarRabbitMQ() {
  if (cerrando) return false;
  if (canal) return true;
  if (conectando) return conectando;

  conectando = (async () => {
    let nuevaConexion = null;

    try {
      const url = process.env.RABBITMQ_URL;

      if (!url) {
        console.warn('[RABBITMQ] URL no configurada');
        return false;
      }

      nuevaConexion = await amqp.connect(url, {
        timeout: 5000
      });

      const nuevoCanal =
        await nuevaConexion.createConfirmChannel();

      await nuevoCanal.assertQueue(COLA_AUDITORIA, {
        durable: true
      });

      conexion = nuevaConexion;
      canal = nuevoCanal;

      nuevaConexion.on('error', (error) => {
        console.warn(
          '[RABBITMQ] Error de conexión:',
          error.code || 'ERROR_AMQP'
        );
      });

      nuevaConexion.on('close', () => {
        console.warn('[RABBITMQ] Conexión cerrada');

        if (conexion === nuevaConexion) {
          conexion = null;
          canal = null;
        }

        programarReconexion();
      });

      nuevoCanal.on('error', (error) => {
        console.warn(
          '[RABBITMQ] Error del canal:',
          error.code || 'ERROR_AMQP'
        );
      });

      nuevoCanal.on('close', () => {
        if (canal === nuevoCanal) {
          canal = null;
          programarReconexion();
        }
      });

      console.log('[RABBITMQ] Conectado correctamente');
      return true;

    } catch (error) {
      console.warn(
        '[RABBITMQ] No disponible:',
        error.code || 'ERROR_AMQP'
      );

      if (nuevaConexion) {
        try {
          await nuevaConexion.close();
        } catch {
          // La conexión puede estar cerrada.
        }
      }

      programarReconexion();
      return false;
    }
  })();

  try {
    return await conectando;
  } finally {
    conectando = null;
  }
}

// ========================================
// PRODUCTOR DE AUDITORÍA
// ========================================

export async function publicarEventoAuditoria(evento) {
  let canalUsado = null;
  try {
    if (!canal) {
      programarReconexion();
      return false;
    }
    const mensaje = crearEventoAuditoria(evento);
    canalUsado = canal;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Tiempo de publicación agotado')), 1500);
      timer.unref();
      const confirmar = (error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      try {
        canalUsado.sendToQueue(
          COLA_AUDITORIA,
          Buffer.from(JSON.stringify(mensaje)),
          { persistent: true, contentType: 'application/json', messageId: mensaje.evento_id },
          confirmar
        );
      } catch (error) {
        confirmar(error);
      }
    });
    return true;
  } catch (error) {
    console.warn('[RABBITMQ] Publicación no confirmada:', error.code || 'ERROR_AMQP');
    // Una confirmación tardía de un canal anterior no debe cerrar la conexión nueva.
    if (canalUsado && canal === canalUsado) {
      const conexionFallida = conexion;
      conexion = null;
      canal = null;
      if (conexionFallida) void conexionFallida.close().catch(() => {});
    }
    programarReconexion();
    return false;
  }
}

// ========================================
// CIERRE CONTROLADO
// ========================================

export async function cerrarRabbitMQ() {
  cerrando = true;

  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }

  const canalActual = canal;
  const conexionActual = conexion;

  canal = null;
  conexion = null;

  try {
    if (canalActual) await canalActual.close();
  } catch {
    // El canal ya podría estar cerrado.
  }

  try {
    if (conexionActual) await conexionActual.close();
  } catch {
    // La conexión ya podría estar cerrada.
  }
}
