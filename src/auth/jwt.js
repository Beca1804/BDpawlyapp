
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

// Duración de las sesiones en segundos
export const SESSION_TTL = Number(process.env.SESSION_TTL) || 3600;

// Generar JWT con identificador único
export function generarToken(usuario) {
  const jti = randomUUID();

  const token = jwt.sign(
    {
      sub: usuario._id.toString(),
      jti,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    {
      expiresIn: SESSION_TTL,
      algorithm: 'HS256'
    }
  );

  return { token, jti };
}

// Verificar firma y expiración del JWT
export function verificarToken(token) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET,
    {
      algorithms: ['HS256']
    }
  );
}
