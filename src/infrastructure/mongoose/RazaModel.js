import mongoose from 'mongoose';

const RazaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la raza es obligatorio'],
      trim: true,
      unique: true,
      minlength: [2, 'El nombre de la raza debe tener al menos 2 caracteres'],
      maxlength: [100, 'El nombre de la raza es demasiado largo']
    },

    tamanoPromedio: {
      type: String,
      enum: {
        values: ['PEQUEÑO', 'MEDIANO', 'GRANDE'],
        message: 'El tamaño promedio de la raza no es válido'
      },
      required: [true, 'El tamaño promedio es obligatorio']
    },

    esperanzaVidaMin: {
      type: Number,
      min: [1, 'La esperanza de vida mínima debe ser mayor que 0'],
      required: [true, 'La esperanza de vida mínima es obligatoria']
    },

    esperanzaVidaMax: {
      type: Number,
      min: [1, 'La esperanza de vida máxima debe ser mayor que 0'],
      required: [true, 'La esperanza de vida máxima es obligatoria'],
      validate: {
        validator: function (valor) {
          return valor >= this.esperanzaVidaMin;
        },
        message:
          'La esperanza de vida máxima no puede ser menor que la mínima'
      }
    },

    paisOrigen: {
      type: String,
      trim: true,
      maxlength: [100, 'El país de origen es demasiado largo'],
      default: ''
    },

    temperamento: {
      type: [String],
      default: []
    },

    nivelEnergia: {
      type: String,
      enum: {
        values: ['BAJO', 'MEDIO', 'ALTO'],
        message: 'El nivel de energía no es válido'
      },
      default: 'MEDIO'
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [1000, 'La descripción de la raza es demasiado larga'],
      default: ''
    },

    estado: {
      type: String,
      enum: {
        values: ['ACTIVA', 'INACTIVA'],
        message: 'El estado de la raza no es válido'
      },
      default: 'ACTIVA'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

RazaSchema.index({ tamanoPromedio: 1 });

RazaSchema.index({ nivelEnergia: 1 });

export const RazaModel = mongoose.model('Raza', RazaSchema);