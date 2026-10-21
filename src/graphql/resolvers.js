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

export const resolvers = {
  Query: {
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

    listarRazas: async () => {
      return await RazaModel.find();
    },

    obtenerVeterinaria: async (_, { id }) => {
      return await VeterinariaModel.findById(id);
    },

    listarVeterinarias: async () => {
      return await VeterinariaModel.find({ estado: 'ACTIVA' });
    },

    listarActividadPorPerro: async (_, { perroId }) => {
      return await RegistroActividadModel.find({ perroId }).sort({
        fecha: -1
      });
    },

    listarRegistrosMedicos: async (_, { perroId }) => {
      return await RegistroMedicoModel.find({ perroId }).sort({
        fechaRegistro: -1
      });
    },

    listarCitasPorPerro: async (_, { perroId }) => {
      return await CitaVeterinariaModel.find({ perroId }).sort({
        fechaHora: -1
      });
    },

    listarPublicaciones: async () => {
      return await PublicacionModel.find({ estado: 'PUBLICADA' }).sort({
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

  Mutation: {
    crearUsuario: async (_, { input }) => {
      const usuario = new UsuarioModel(input);
      return await usuario.save();
    },

    crearRaza: async (_, { input }) => {
      const raza = new RazaModel(input);
      return await raza.save();
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
        const veterinariaExiste = await VeterinariaModel.exists({
          _id: input.veterinariaId
        });

        if (!veterinariaExiste) {
          throw new Error('La veterinaria indicada no existe');
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

      const veterinariaExiste = await VeterinariaModel.exists({
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