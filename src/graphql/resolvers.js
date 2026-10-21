import {login,logout,autorizado,esAdmin,mascotaPropia,limitarLogin} from '../security/auth.js';
import {fail,safeError} from '../security/errors.js';
import {medicalQuery,medicalMutation} from '../services/medical.js';
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
      return await UsuarioModel.find().limit(100);
    },

    obtenerPerro: async (_, { id }) => {
      return await PerroModel.findById(id);
    },

    listarPerros: async () => {
      return await PerroModel.find().limit(100);
    },

    listarPerrosPorUsuario: async (_, { usuarioId }) => {
      return await PerroModel.find({ usuarioId });
    },

    obtenerRaza: async (_, { id }) => {
      return await RazaModel.findById(id);
    },

    listarRazas: async () => {
      return await RazaModel.find().limit(100);
    },

    obtenerVeterinaria: async (_, { id }) => {
      return await VeterinariaModel.findById(id);
    },

    listarVeterinarias: async () => {
      return await VeterinariaModel.find({ estado: 'ACTIVA' }).limit(100);
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

// Mantener los contratos originales, añadiendo autenticación y alcance por propietario.
Object.assign(resolvers.Query,medicalQuery,{
 me:async (_,args,ctx)=>UsuarioModel.findById(autorizado(ctx).id),
 obtenerUsuario:async (_,{id},ctx)=>{const u=autorizado(ctx);if(u.rol!=='ADMIN'&&id!==u.id)fail('Usuario no disponible.','FORBIDDEN');return UsuarioModel.findById(id);},
 listarUsuarios:async (_,args,ctx)=>{const u=autorizado(ctx);return UsuarioModel.find(u.rol==='ADMIN'?{}:{_id:u.id}).limit(100);},
 obtenerPerro:async (_,{id},ctx)=>mascotaPropia(id,ctx),
 listarPerros:async (_,args,ctx)=>{const u=autorizado(ctx);return PerroModel.find(u.rol==='ADMIN'?{}:{usuarioId:u.id}).limit(100);},
 listarPerrosPorUsuario:async (_,{usuarioId},ctx)=>{const u=autorizado(ctx);if(u.rol!=='ADMIN'&&usuarioId!==u.id)fail('Usuario no disponible.','FORBIDDEN');return PerroModel.find({usuarioId}).limit(100);}
});
Object.assign(resolvers.Mutation,{login,logout,...medicalMutation});
function ids(value,key='') {
 if(value==null)return;
 if((key==='id'||key.endsWith('Id'))&&(typeof value!=='string'||!/^[a-f0-9]{24}$/i.test(value)))fail('Identificador inválido.');
 if(typeof value==='object')for(const [k,v] of Object.entries(value))ids(v,k);
}
for(const [kind,operations] of Object.entries(resolvers)) {
 for(const [name,fn] of Object.entries(operations)) {
  operations[name]=async (parent,args,ctx,info)=>{
   try {
    ids(args);
    const publicRead=['obtenerRaza','listarRazas','obtenerVeterinaria','listarVeterinarias'].includes(name);
    if(!publicRead&&!['crearUsuario','login'].includes(name))autorizado(ctx);
    if(name==='crearUsuario'){await limitarLogin(ctx.ip);}
    if(['crearRaza','crearVeterinaria'].includes(name)&&!esAdmin(ctx))fail('Solo un administrador puede editar catálogos.','FORBIDDEN');
    if(args.input?.usuarioId&&ctx.user?.rol!=='ADMIN'&&args.input.usuarioId!==ctx.user?.id)fail('No puedes asignar datos a otro usuario.','FORBIDDEN');
    // Las publicaciones son sociales; la actividad, cartilla, citas y expedientes son privados.
    if(['listarActividadPorPerro','listarCitasPorPerro','agregarVacuna','registrarActividad','crearCitaVeterinaria','crearPublicacion'].includes(name))await mascotaPropia(args.perroId||args.input?.perroId,ctx);
    const result=await fn(parent,args,ctx,info);
    return Array.isArray(result)&&!['listarRegistrosMedicos','resumenExpedientes'].includes(name)?result.slice(0,100):result;
   }catch(error){return safeError(error);}
  };
 }
}
// ID explícito para documentos y copias JSON de Redis; fechas ISO uniformes.
for(const type of ['Usuario','Raza','Perro','Veterinaria','RegistroActividad','RegistroMedico','CitaVeterinaria','Publicacion','Seguimiento','Vacuna'])resolvers[type]={id:row=>String(row._id||row.id)};
for(const [type,fields] of Object.entries({Perro:['fechaNacimiento'],Vacuna:['fechaAplicacion','proximaDosis'],RegistroActividad:['fecha'],RegistroMedico:['fechaRegistro'],CitaVeterinaria:['fechaHora']})) {
 for(const field of fields)resolvers[type][field]=row=>row[field]==null?null:new Date(row[field]).toISOString();
}
