
import { performance } from 'node:perf_hooks';
import { GraphQLError } from 'graphql';

import { redisClient } from '../infrastructure/database/redis.js';
import { generarToken } from '../auth/jwt.js';

import {
  publicarEventoAuditoria
} from '../infrastructure/messaging/rabbitmq.js';

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

import {
  validarAccesoRuta,
  obtenerMenuUsuario,
  asignarRolTutor
} from '../services/rbac.service.js';

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

// ========================================
// AUTORIZACIÓN RBAC CON NEO4J
// ========================================

function errorProhibido() {
  return new GraphQLError(
    '403 Forbidden: No tienes permisos para realizar esta operación.',
    {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 }
      }
    }
  );
}

async function autorizarRuta(usuario, path, method, operation) {
  if (!usuario) {
    throw errorAutenticacion();
  }

  const autorizado = await validarAccesoRuta(
    usuario._id.toString(),
    path,
    method,
    operation
  );

  if (!autorizado) {
    throw errorProhibido();
  }
}

export const resolvers = {

  // ========================================
  // QUERIES
  // ========================================

  Query: {

    // ========================================
    // MENÚ DINÁMICO RBAC - NEO4J
    // ========================================

    miMenu: async (_, __, { usuario }) => {
      if (!usuario) {
        throw errorAutenticacion();
      }

      return await obtenerMenuUsuario(
        usuario._id.toString()
      );
    },

    // ========================================
    // CONSULTA PROTEGIDA DEL SEGUNDO PARCIAL
    // ========================================

    me: async (_, __, { usuario }) => {
      if (!usuario) {
        throw errorAutenticacion();
      }

      return usuario;
    },

    // ========================================
    // CONSULTAS DEL PRIMER PARCIAL
    // ========================================

    obtenerUsuario: async (_, { id }, { usuario }) => {

      // 1. Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // 2. Verificar permiso RBAC
      await autorizarRuta(
        usuario,
        '/mi-perfil',
        'QUERY',
        'miPerfil'
      );

      // 3. Comprobar que consulta su propio perfil
      if (id.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Obtener información del usuario
      return await UsuarioModel.findById(id);
    },

    listarUsuarios: async (_, __, { usuario }) => {
      await autorizarRuta(
        usuario,
        '/admin/usuarios',
        'QUERY',
        'listarUsuarios'
      );

      return await UsuarioModel.find();
    },

    obtenerPerro: async (_, { id }, { usuario }) => {

      // 1. Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // 2. Verificar permiso RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/mascotas',
        'QUERY',
        'misMascotas'
      );

      // 3. Buscar mascota
      const perro = await PerroModel.findById(id);

      if (!perro) {
        return null;
      }

      // 4. Comprobar que pertenece al usuario
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      return perro;
    },

    listarPerros: async (_, __, { usuario }) => {

      // 1. Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // 2. Verificar permiso RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/mascotas',
        'QUERY',
        'misMascotas'
      );

      // 3. Consultar únicamente las mascotas del usuario
      return await PerroModel.find({
        usuarioId: usuario._id
      });
    },

    listarPerrosPorUsuario: async (
      _,
      { usuarioId },
      { usuario }
    ) => {

      // Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // Verificar que consulta sus propias mascotas
      if (usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // Verificar permiso en Neo4j
      await autorizarRuta(
        usuario,
        '/mascotas',
        'QUERY',
        'misMascotas'
      );

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

    listarActividadPorPerro: async (_, { perroId }, { usuario }) => {

      // 1. Verificar permiso RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/actividad/:mascotaId',
        'QUERY',
        'resumenPaseos'
      );

      // 2. Buscar mascota
      const perro = await PerroModel.findById(perroId);

      if (!perro) {
        return [];
      }

      // 3. Verificar que pertenece al usuario autenticado
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Consultar actividades
      return await RegistroActividadModel.find({
        perroId
      }).sort({
        fecha: -1
      });
    },

    listarRegistrosMedicos: async (_, { perroId }, { usuario }) => {

      // 1. Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // 2. Verificar permisos RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/salud/historial/:mascotaId',
        'QUERY',
        'historialMedico'
      );

      // 3. Buscar mascota
      const perro = await PerroModel.findById(perroId);

      if (!perro) {
        return [];
      }

      // 4. Comprobar que pertenece al usuario
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 5. Obtener historial médico
      return await RegistroMedicoModel.find({
        perroId
      }).sort({
        fechaRegistro: -1
      });
    },

    listarCitasPorPerro: async (_, { perroId }, { usuario }) => {

      // 1. Verificar autorización RBAC
      await autorizarRuta(
        usuario,
        '/veterinaria/citas',
        'QUERY',
        'listarCitasPorPerro'
      );

      // 2. Buscar mascota
      const perro = await PerroModel.findById(perroId);

      if (!perro) {
        return [];
      }

      // 3. Verificar que pertenece al usuario
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Consultar citas veterinarias
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

      // ========================================
      // AUDITORÍA ASÍNCRONA - RABBITMQ
      // ========================================

      await publicarEventoAuditoria({
        tipo_evento: 'LOGIN_EXITOSO',
        usuario_id: usuario._id.toString(),
        jti,
        resultado: 'EXITO'
      });

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
      if (!usuario || !jti) {
        throw errorAutenticacion();
      }

      await redisClient.del(`sesion:${jti}`);

      console.log('[LOGOUT] Sesión revocada en Redis');

      return true;
    },

    // ========================================
    // OPERACIONES DEL PRIMER PARCIAL
    // ========================================


    crearUsuario: async (_, { input }) => {

      // 1. Impedir que el cliente elija su rol o estado
      const {
        rol,
        estado,
        ...datosUsuario
      } = input;

      // 2. Crear usuario normal en MongoDB
      const usuario = new UsuarioModel({
        ...datosUsuario,
        rol: 'USUARIO',
        estado: 'ACTIVO'
      });

      const nuevoUsuario = await usuario.save();

      // 3. Asignar automáticamente el rol TUTOR en Neo4j
      try {
        await asignarRolTutor(nuevoUsuario._id.toString());

        console.log(
          '[REGISTRO] Usuario registrado en MongoDB y Neo4j'
        );

      } catch (error) {
        console.error(
          '[REGISTRO] Error al asignar rol en Neo4j:',
          error.message
        );

        throw new Error(
          'Usuario creado en MongoDB, pero no se pudo asignar el rol en Neo4j.'
        );
      }

      // 4. Devolver usuario registrado
      return nuevoUsuario;
    },


    // Crear raza e invalidar caché
    crearRaza: async (_, { input }, { usuario }) => {

      // 1. Verificar autorización RBAC
      await autorizarRuta(
        usuario,
        '/admin/razas/crear',
        'MUTATION',
        'crearRaza'
      );

      // 2. Crear raza en MongoDB
      const raza = new RazaModel(input);

      const nuevaRaza = await raza.save();

      // 3. Invalidar caché de Redis
      await redisClient.del('pawly:razas');

      console.log('[REDIS DEL] Caché de razas invalidada');

      return nuevaRaza;
    },

    // ========================================
    // CREAR PERRO CON AUTORIZACIÓN RBAC
    // ========================================

    crearPerro: async (_, { input }, { usuario }) => {

      // Verificar permisos RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/mascotas/crear',
        'MUTATION',
        'crearMascota'
      );

      // Comprobar que la mascota pertenece al usuario autenticado
      if (input.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

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

    crearVeterinaria: async (_, { input }, { usuario }) => {
      await autorizarRuta(usuario, '/admin/veterinarias/crear', 'MUTATION', 'crearVeterinaria');
      return VeterinariaModel.create(input);
    },

    registrarActividad: async (_, { input }, { usuario }) => {

      // 1. Verificar permiso RBAC en Neo4j
      await autorizarRuta(
        usuario,
        '/actividad/registrar',
        'MUTATION',
        'registrarActividad'
      );

      // 2. Buscar la mascota
      const perro = await PerroModel.findById(input.perroId);

      if (!perro) {
        throw new Error('El perro indicado no existe');
      }

      // 3. Comprobar que pertenece al usuario autenticado
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Crear el registro de actividad
      const actividad = new RegistroActividadModel({
        ...input,
        metaPasos:
          input.metaPasos !== undefined
            ? input.metaPasos
            : perro.metaPasos
      });

      return await actividad.save();
    },

    agregarVacuna: async (_, { perroId, input }, { usuario }) => {

      // 1. Verificar autenticación
      if (!usuario) {
        throw errorAutenticacion();
      }

      // 2. Buscar mascota
      const perro = await PerroModel.findById(perroId);

      if (!perro) {
        throw new Error('El perro indicado no existe');
      }

      // 3. Comprobar que el usuario es propietario
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Verificar permiso de escritura en Neo4j
      await autorizarRuta(
        usuario,
        '/salud/vacunas/agregar',
        'MUTATION',
        'agregarVacuna'
      );

      // 5. Comprobar veterinaria, si se proporciona
      if (input.veterinariaId) {
        const veterinariaExiste = await VeterinariaModel.exists({
          _id: input.veterinariaId
        });

        if (!veterinariaExiste) {
          throw new Error(
            'La veterinaria indicada no existe'
          );
        }
      }

      // 6. Registrar vacuna
      perro.cartilla.vacunas.push(input);

      await perro.save();

      return perro;
    },

    // ========================================
    // CREAR CITA VETERINARIA CON RBAC
    // ========================================

    crearCitaVeterinaria: async (_, { input }, { usuario }) => {

      // 1. Verificar autorización RBAC
      await autorizarRuta(
        usuario,
        '/veterinaria/citas/crear',
        'MUTATION',
        'crearCitaVeterinaria'
      );

      // 2. Buscar la mascota
      const perro = await PerroModel.findById(input.perroId);

      if (!perro) {
        throw new Error('El perro indicado no existe');
      }

      // 3. Comprobar que pertenece al usuario
      if (perro.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

      // 4. Verificar que existe la veterinaria
      const veterinariaExiste = await VeterinariaModel.exists({
        _id: input.veterinariaId
      });

      if (!veterinariaExiste) {
        throw new Error('La veterinaria indicada no existe');
      }

      // 5. Guardar la cita
      const cita = new CitaVeterinariaModel(input);

      return await cita.save();
    },

    // ========================================
    // CREAR PUBLICACIÓN CON AUTORIZACIÓN RBAC
    // ========================================

    crearPublicacion: async (_, { input }, { usuario }) => {

      // Verificar permisos RBAC antes de modificar MongoDB
      await autorizarRuta(
        usuario,
        '/comunidad/publicar',
        'MUTATION',
        'crearPublicacion'
      );

      // Impedir publicaciones a nombre de otro usuario
      if (input.usuarioId.toString() !== usuario._id.toString()) {
        throw errorProhibido();
      }

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
