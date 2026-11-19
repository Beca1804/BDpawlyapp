import mongoose from 'mongoose';

const UbicacionSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: {
    type: [Number], required: true,
    validate: {
      validator: c => Array.isArray(c) && c.length === 2 &&
        c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90,
      message: 'Las coordenadas deben contener [longitud, latitud] válidas'
    }
  }
}, { _id: false });

const VeterinariaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la veterinaria es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [120, 'El nombre de la veterinaria es demasiado largo']
    },

    direccion: {
      type: String,
      required: [true, 'La dirección de la veterinaria es obligatoria'],
      trim: true,
      maxlength: [250, 'La dirección es demasiado larga']
    },

    telefono: {
      type: String,
      required: [true, 'El teléfono de la veterinaria es obligatorio'],
      trim: true,
      maxlength: [30, 'El teléfono es demasiado largo']
    },

    correo: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      validate: {
        validator: function (valor) {
          if (!valor) return true;

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
        },
        message: 'El correo electrónico de la veterinaria no es válido'
      }
    },

    horario: {
      type: String,
      trim: true,
      maxlength: [200, 'El horario es demasiado largo'],
      default: ''
    },

    servicios: {
      type: [String],
      default: [],
      validate: {
        validator: function (servicios) {
          return Array.isArray(servicios);
        },
        message: 'Los servicios deben almacenarse como una lista'
      }
    },

    ubicacion: { type: UbicacionSchema, default: undefined },

    estado: {
      type: String,
      enum: {
        values: ['ACTIVA', 'INACTIVA'],
        message: 'El estado de la veterinaria no es válido'
      },
      default: 'ACTIVA'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

VeterinariaSchema.index({ nombre: 1 });

VeterinariaSchema.index({ estado: 1 });

VeterinariaSchema.index({ ubicacion: '2dsphere' });

export const VeterinariaModel = mongoose.model(
  'Veterinaria',
  VeterinariaSchema
);