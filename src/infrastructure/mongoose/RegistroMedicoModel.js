import mongoose from 'mongoose';

const RegistroMedicoSchema = new mongoose.Schema(
  {
    perroId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perro',
      required: [true, 'El perro es obligatorio'],
      index: true
    },

    tipoRegistro: {
      type: String,
      required: [true, 'El tipo de registro médico es obligatorio'],
      enum: {
        values: [
          'CONSULTA',
          'DIAGNOSTICO',
          'ALERGIA',
          'ENFERMEDAD',
          'CIRUGIA',
          'TRATAMIENTO',
          'MEDICAMENTO',
          'OTRO'
        ],
        message: 'El tipo de registro médico no es válido'
      }
    },

    descripcion: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: [1000, 'La descripción es demasiado larga']
    },

    fechaRegistro: {
      type: Date,
      required: [true, 'La fecha del registro médico es obligatoria'],
      default: Date.now,
      validate: {
        validator: function (fecha) {
          return fecha <= new Date();
        },
        message: 'La fecha del registro médico no puede estar en el futuro'
      }
    },

    veterinariaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinaria',
      default: null
    },

    diagnostico: {
      type: String,
      trim: true,
      maxlength: [1000, 'El diagnóstico es demasiado largo'],
      default: ''
    },

    tratamiento: {
      type: String,
      trim: true,
      maxlength: [1000, 'El tratamiento es demasiado largo'],
      default: ''
    },

    medicamentos: {
      type: [
        {
          nombre: {
            type: String,
            required: true,
            trim: true
          },

          dosis: {
            type: String,
            trim: true,
            default: ''
          },

          frecuencia: {
            type: String,
            trim: true,
            default: ''
          },

          fechaInicio: {
            type: Date,
            default: null
          },

          fechaFin: {
            type: Date,
            default: null
          }
        }
      ],
      default: []
    },

    observaciones: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las observaciones son demasiado largas'],
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

RegistroMedicoSchema.index({ perroId: 1, fechaRegistro: -1 });

RegistroMedicoSchema.index({ veterinariaId: 1 });

RegistroMedicoSchema.index({ tipoRegistro: 1 });

export const RegistroMedicoModel = mongoose.model(
  'RegistroMedico',
  RegistroMedicoSchema
);