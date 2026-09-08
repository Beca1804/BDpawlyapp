import mongoose from 'mongoose';

const RegistroActividadSchema = new mongoose.Schema(
  {
    perroId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perro',
      required: [true, 'El perro es obligatorio'],
      index: true
    },

    fecha: {
      type: Date,
      required: [true, 'La fecha de actividad es obligatoria'],
      default: Date.now
    },

    pasos: {
      type: Number,
      required: [true, 'La cantidad de pasos es obligatoria'],
      min: [0, 'La cantidad de pasos no puede ser negativa']
    },

    distancia: {
      type: Number,
      min: [0, 'La distancia no puede ser negativa'],
      default: 0
    },

    calorias: {
      type: Number,
      min: [0, 'Las calorías no pueden ser negativas'],
      default: 0
    },

    tiempoActividad: {
      type: Number,
      min: [0, 'El tiempo de actividad no puede ser negativo'],
      default: 0
    },

    metaPasos: {
      type: Number,
      min: [0, 'La meta de pasos no puede ser negativa'],
      default: 0
    },

    metaCumplida: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

RegistroActividadSchema.pre('save', function () {
  if (this.metaPasos > 0) {
    this.metaCumplida = this.pasos >= this.metaPasos;
  } else {
    this.metaCumplida = false;
  }
});

RegistroActividadSchema.index({ perroId: 1, fecha: -1 });

RegistroActividadSchema.index({ fecha: -1 });

export const RegistroActividadModel = mongoose.model(
  'RegistroActividad',
  RegistroActividadSchema
);