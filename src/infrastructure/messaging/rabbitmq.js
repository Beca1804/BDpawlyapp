
import amqp from 'amqplib';
import cassandra from 'cassandra-driver';

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
          error.message
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
          error.message
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
        error.message
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
  try {
    if (!canal) {
      programarReconexion();
      return false;
    }

    const mensaje = {
      evento_id: cassandra.types.TimeUuid.now().toString(),
      tipo_evento: evento.tipo_evento,
      usuario_id: evento.usuario_id ?? null,
      jti: evento.jti ?? null,
      resultado: evento.resultado,
      fecha: new Date().toISOString()
    };

    const canalActual = canal;

    await new Promise((resolve, reject) => {
      canalActual.sendToQueue(
        COLA_AUDITORIA,
        Buffer.from(JSON.stringify(mensaje)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: mensaje.evento_id
        },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    return true;

  } catch (error) {
    console.warn(
      '[RABBITMQ] No se pudo publicar el evento:',
      error.message
    );

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
