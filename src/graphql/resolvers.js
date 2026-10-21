
import { performance } from 'node:perf_hooks';
import { GraphQLError } from 'graphql';

import { redisClient } from '../infrastructure/database/redis.js';
import { generarToken } from '../auth/jwt.js';

import {
  UsuarioModel,
  PerroModel,
  RazaModel,
  VeterinariaModel,
  RegistroActividadModel,
  RegistroMedicoModel,
  CitaVeterinariaModel,
  PublicacionModel
} from '../infrastructure/mongoose/index.js';

// ========================================
// ERROR DE AUTENTICACIÓN
// ========================================

function errorAutenticacion() {
  return new GraphQLError(
    'No estás autenticado o tu sesión ha sido revocada.',
    {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 }
      }
    }
  );
}

export const resolvers = {

  // ========================================
  // QUERIES
  // ========================================

  Query: {

    // CONSULTA PROTEGIDA DEL SEGUNDO PARCIAL
    me: async (_, __, { usuario }) => {
      if (!usuario) {
        throw errorAutenticacion();
      }

      return usuario;
    },

    // CONSULTAS DEL PRIMER PARCIAL

    obtenerUsuario: async (_, { id }) => {
      return await UsuarioModel.findById(id);
    },

    listarUsuarios: async () => {
      return await UsuarioModel.find();
    },

    obtenerPerro: async (_, { id }) => {
      return await PerroModel.findById(id);
    },

    listarPerros: async () => {
      return await PerroModel.find();
    },

    listarPerrosPorUsuario: async (_, { usuarioId }) => {
      return await PerroModel.find({ usuarioId });
    },

    obtenerRaza: async (_, { id }) => {
      return await RazaModel.findById(id);
    },

    // ========================================
    // CACHE-ASIDE CON REDIS
    // ========================================

    listarRazas: async () => {
      const clave = 'pawly:razas';

      // 1. Medir lectura de Redis
      const inicioRedis = performance.now();

      const cache = await redisClient.get(clave);

      const latenciaRedis = performance.now() - inicioRedis;

      // 2. CACHE HIT: devolver datos desde Redis
      if (cache !== null) {
        console.log(
          `[REDIS HIT] listarRazas: ${latenciaRedis.toFixed(3)} ms`
        );

        return JSON.parse(cache);
      }

      // 3. CACHE MISS: consultar MongoDB
      const inicioMongo = performance.now();

      const documentos = await RazaModel.find().lean();

      // Convertir _id a id para GraphQL
      const razas = documentos.map(raza => ({
        ...raza,
        id: raza._id.toString()
      }));

      const latenciaMongo = performance.now() - inicioMongo;

      // 4. Guardar en Redis con TTL
      await redisClient.set(
        clave,
        JSON.stringify(razas),
        {
          EX: Number(process.env.HISTORY_CACHE_TTL) || 60
        }
      );

      console.log(
        `[MONGO MISS] listarRazas: ${latenciaMongo.toFixed(3)} ms`
      );

      console.log(
        `[REDIS GET] Comprobación inicial: ${latenciaRedis.toFixed(3)} ms`
      );

      return razas;
    },

    obtenerVeterinaria: async (_, { id }) => {
      return await VeterinariaModel.findById(id);
    },

    listarVeterinarias: async () => {
      return await VeterinariaModel.find({
        estado: 'ACTIVA'
      });
    },

    listarActividadPorPerro: async (_, { perroId }) => {
      return await RegistroActividadModel.find({
        perroId
      }).sort({
        fecha: -1
      });
    },

    listarRegistrosMedicos: async (_, { perroId }) => {
      return await RegistroMedicoModel.find({
        perroId
      }).sort({
        fechaRegistro: -1
      });
    },

    listarCitasPorPerro: async (_, { perroId }) => {
      return await CitaVeterinariaModel.find({
        perroId
      }).sort({
        fechaHora: -1
      });
    },

    listarPublicaciones: async () => {
      return await PublicacionModel.find({
        estado: 'PUBLICADA'
      }).sort({
        createdAt: -1
      });
    },

    listarPublicacionesPorPerro: async (_, { perroId }) => {
      return await PublicacionModel.find({
        perroId,
        estado: 'PUBLICADA'
      }).sort({
        createdAt: -1
      });
    }
  },

  // ========================================
  // MUTATIONS
  // ========================================

  Mutation: {

    // ========================================
    // LOGIN CON JWT Y REDIS
    // ========================================

    login: async (_, { correo, password }) => {

      // 1. Buscar usuario incluyendo su contraseña
      const usuario = await UsuarioModel.findOne({
        correo: correo.trim().toLowerCase()
      }).select('+password');

      if (!usuario) {
        throw new Error('Correo o contraseña incorrectos');
      }

      // 2. Verificar contraseña con bcrypt
      const passwordCorrecta =
        await usuario.compararPassword(password);

      if (!passwordCorrecta) {
        throw new Error('Correo o contraseña incorrectos');
      }

      // 3. Verificar estado del usuario
      if (usuario.estado !== 'ACTIVO') {
        throw new Error('Usuario inactivo o bloqueado');
      }

      // 4. Generar JWT con jti único
      const { token, jti } = generarToken(usuario);

      // 5. Guardar sesión en Redis
      const ttl = Number(process.env.SESSION_TTL) || 3600;

      await redisClient.set(
        `sesion:${jti}`,
        usuario._id.toString(),
        { EX: ttl }
      );

      console.log('[LOGIN] Sesión registrada en Redis');

      // 6. Devolver token y usuario
      return {
        token,
        usuario
      };
    },

    // ========================================
    // LOGOUT CON REVOCACIÓN INMEDIATA
    // ========================================

    logout: async (_, __, { usuario, jti }) => {

      // Verificar que existe una sesión autenticada
      if (!usuario || !jti) {
        throw errorAutenticacion();
      }

      // Eliminar la sesión de Redis
      await redisClient.del(`sesion:${jti}`);

      console.log('[LOGOUT] Sesión revocada en Redis');

      return true;
    },

    // ========================================
    // OPERACIONES DEL PRIMER PARCIAL
    // ========================================

    crearUsuario: async (_, { input }) => {
      const usuario = new UsuarioModel(input);

      return await usuario.save();
    },

    // Crear raza e invalidar caché
    crearRaza: async (_, { input }) => {
      const raza = new RazaModel(input);

      const nuevaRaza = await raza.save();

      await redisClient.del('pawly:razas');

      console.log('[REDIS DEL] Caché de razas invalidada');

      return nuevaRaza;
    },

    crearPerro: async (_, { input }) => {
      const usuarioExiste = await UsuarioModel.exists({
        _id: input.usuarioId
      });

      if (!usuarioExiste) {
        throw new Error('El usuario propietario no existe');
      }

      const razaExiste = await RazaModel.exists({
        _id: input.razaId
      });

      if (!razaExiste) {
        throw new Error('La raza indicada no existe');
      }

      const perro = new PerroModel(input);

      return await perro.save();
    },

    crearVeterinaria: async (_, { input }) => {
      const veterinaria = new VeterinariaModel(input);

      return await veterinaria.save();
    },

    registrarActividad: async (_, { input }) => {
      const perro = await PerroModel.findById(input.perroId);

      if (!perro) {
        throw new Error('El perro indicado no existe');
      }

      const actividad = new RegistroActividadModel({
        ...input,
        metaPasos:
          input.metaPasos !== undefined
            ? input.metaPasos
            : perro.metaPasos
      });

      return await actividad.save();
    },

    agregarVacuna: async (_, { perroId, input }) => {
      const perro = await PerroModel.findById(perroId);

      if (!perro) {
        throw new Error('El perro indicado no existe');
      }

      if (input.veterinariaId) {
        const veterinariaExiste =
          await VeterinariaModel.exists({
            _id: input.veterinariaId
          });

        if (!veterinariaExiste) {
          throw new Error(
            'La veterinaria indicada no existe'
          );
        }
      }

      perro.cartilla.vacunas.push(input);

      await perro.save();

      return perro;
    },

    crearCitaVeterinaria: async (_, { input }) => {
      const perroExiste = await PerroModel.exists({
        _id: input.perroId
      });

      if (!perroExiste) {
        throw new Error('El perro indicado no existe');
      }

      const veterinariaExiste =
        await VeterinariaModel.exists({
          _id: input.veterinariaId
        });

      if (!veterinariaExiste) {
        throw new Error('La veterinaria indicada no existe');
      }

      const cita = new CitaVeterinariaModel(input);

      return await cita.save();
    },

    crearPublicacion: async (_, { input }) => {
      const usuarioExiste = await UsuarioModel.exists({
        _id: input.usuarioId
      });

      if (!usuarioExiste) {
        throw new Error('El usuario indicado no existe');
      }

      const perro = await PerroModel.findOne({
        _id: input.perroId,
        usuarioId: input.usuarioId
      });

      if (!perro) {
        throw new Error(
          'La mascota no existe o no pertenece al usuario'
        );
      }

      const publicacion = new PublicacionModel(input);

      return await publicacion.save();
    }
  }
};
