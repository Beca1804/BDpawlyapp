import mongoose from 'mongoose';

const CitaVeterinariaSchema = new mongoose.Schema(
  {
    perroId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perro',
      required: [true, 'El perro es obligatorio'],
      index: true
    },

    veterinariaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinaria',
      required: [true, 'La veterinaria es obligatoria'],
      index: true
    },

    fechaHora: {
      type: Date,
      required: [true, 'La fecha y hora de la cita son obligatorias']
    },

    motivo: {
      type: String,
      required: [true, 'El motivo de la cita es obligatorio'],
      trim: true,
      maxlength: [500, 'El motivo de la cita es demasiado largo']
    },

    estado: {
      type: String,
      enum: {
        values: [
          'PENDIENTE',
          'CONFIRMADA',
          'COMPLETADA',
          'CANCELADA'
        ],
        message: 'El estado de la cita no es válido'
      },
      default: 'PENDIENTE'
    },

    notas: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las notas son demasiado largas'],
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

CitaVeterinariaSchema.index({ perroId: 1, fechaHora: -1 });

CitaVeterinariaSchema.index({ veterinariaId: 1, fechaHora: -1 });

CitaVeterinariaSchema.index({ estado: 1 });

export const CitaVeterinariaModel = mongoose.model(
  'CitaVeterinaria',
  CitaVeterinariaSchema
);

