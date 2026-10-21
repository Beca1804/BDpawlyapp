
import { verificarToken } from './jwt.js';

import { redisClient } from '../infrastructure/database/redis.js';

import { UsuarioModel } from '../infrastructure/mongoose/index.js';

import { GraphQLError } from 'graphql';

// Crear el contexto de autenticación para Apollo Server
export async function crearContexto({ req }) {

  // 1. Obtener el encabezado Authorization
  const authorization = req.headers.authorization || '';

  // Permitir peticiones sin token para login y registro.
  // Los resolvers protegidos exigirán usuario autenticado.
  if (!authorization) {
    return {
      usuario: null,
      jti: null
    };
  }

  // 2. Comprobar formato Bearer
  if (!authorization.startsWith('Bearer ')) {
    throw new GraphQLError('Formato de autorización inválido', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 }
      }
    });
  }

  const token = authorization.slice(7).trim();

  try {

    // 3. Verificar firma y expiración del JWT
    const payload = verificarToken(token);

    if (!payload.jti || !payload.sub) {
      throw new Error('Token incompleto');
    }

    // 4. Verificar que la sesión exista en Redis
    const sesion = await redisClient.get(
      `sesion:${payload.jti}`
    );

    // 5. Comprobar que la sesión pertenezca al usuario
    if (!sesion || sesion !== payload.sub) {
      throw new Error('Sesión revocada o expirada');
    }

    // 6. Buscar usuario en MongoDB
    const usuario = await UsuarioModel.findById(payload.sub);

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new Error('Usuario inexistente o inactivo');
    }

    // 7. Devolver contexto autorizado
    return {
      usuario,
      jti: payload.jti
    };

  } catch (error) {

    throw new GraphQLError(
      'No estás autenticado o tu sesión ha sido revocada.',
      {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 }
        }
      }
    );

  }
}
