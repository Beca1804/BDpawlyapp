import mongoose from 'mongoose';

const VacunaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la vacuna es obligatorio'],
      trim: true
    },

    fechaAplicacion: {
      type: Date,
      required: [true, 'La fecha de aplicación es obligatoria']
    },

    proximaDosis: {
      type: Date,
      validate: {
        validator: function (fecha) {
          if (!fecha || !this.fechaAplicacion) return true;
          return fecha >= this.fechaAplicacion;
        },
        message: 'La próxima dosis no puede ser anterior a la fecha de aplicación'
      }
    },

    lote: {
      type: String,
      trim: true,
      default: ''
    },

    estado: {
      type: String,
      enum: {
        values: ['APLICADA', 'PENDIENTE', 'VENCIDA'],
        message: 'Estado de vacuna no válido'
      },
      default: 'APLICADA'
    },

    veterinariaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinaria',
      default: null
    },

    observaciones: {
      type: String,
      trim: true,
      maxlength: [500, 'Las observaciones son demasiado largas'],
      default: ''
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

const CartillaSchema = new mongoose.Schema(
  {
    numeroCartilla: {
      type: String,
      trim: true,
      default: ''
    },

    vacunas: {
      type: [VacunaSchema],
      default: []
    }
  },
  {
    _id: false
  }
);

const PerroSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El propietario del perro es obligatorio'],
      index: true
    },

    nombre: {
      type: String,
      required: [true, 'El nombre del perro es obligatorio'],
      trim: true,
      minlength: [1, 'El nombre del perro no puede estar vacío'],
      maxlength: [80, 'El nombre del perro es demasiado largo']
    },

    razaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Raza',
      required: [true, 'La raza es obligatoria'],
      index: true
    },

    sexo: {
      type: String,
      required: [true, 'El sexo es obligatorio'],
      enum: {
        values: ['MACHO', 'HEMBRA'],
        message: 'El sexo debe ser MACHO o HEMBRA'
      }
    },

    fechaNacimiento: {
      type: Date,
      required: [true, 'La fecha de nacimiento es obligatoria'],
      validate: {
        validator: function (fecha) {
          return fecha <= new Date();
        },
        message: 'La fecha de nacimiento no puede estar en el futuro'
      }
    },

    peso: {
      type: Number,
      required: [true, 'El peso es obligatorio'],
      min: [0.1, 'El peso debe ser mayor que 0']
    },

    tamano: {
      type: String,
      required: [true, 'El tamaño es obligatorio'],
      enum: {
        values: ['PEQUEÑO', 'MEDIANO', 'GRANDE'],
        message: 'El tamaño debe ser PEQUEÑO, MEDIANO o GRANDE'
      }
    },

    color: {
      type: String,
      trim: true,
      maxlength: [100, 'El color es demasiado largo'],
      default: ''
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción es demasiado larga'],
      default: ''
    },

    microchip: {
      type: String,
      trim: true,
      default: undefined
    },

    esterilizado: {
      type: Boolean,
      default: false
    },

    fotoPerfil: {
      type: String,
      trim: true,
      default: ''
    },

    metaPasos: {
      type: Number,
      min: [0, 'La meta de pasos no puede ser negativa'],
      default: 0
    },

    estado: {
      type: String,
      enum: {
        values: ['ACTIVO', 'INACTIVO', 'PERDIDO'],
        message: 'El estado del perro no es válido'
      },
      default: 'ACTIVO'
    },

    cartilla: {
      type: CartillaSchema,
      default: () => ({
        numeroCartilla: '',
        vacunas: []
      })
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

PerroSchema.index(
  { microchip: 1 },
  {
    unique: true,
    sparse: true
  }
);

PerroSchema.index({ usuarioId: 1, nombre: 1 });

export const PerroModel = mongoose.model('Perro', PerroSchema);