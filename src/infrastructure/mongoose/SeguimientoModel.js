import mongoose from 'mongoose';

const SeguimientoSchema = new mongoose.Schema(
  {
    seguidorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario seguidor es obligatorio'],
      index: true
    },

    seguidoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario seguido es obligatorio'],
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

SeguimientoSchema.pre('validate', function () {
  if (
    this.seguidorId &&
    this.seguidoId &&
    this.seguidorId.toString() === this.seguidoId.toString()
  ) {
    throw new Error('Un usuario no puede seguirse a sí mismo');
  }
});

SeguimientoSchema.index(
  { seguidorId: 1, seguidoId: 1 },
  { unique: true }
);

export const SeguimientoModel = mongoose.model(
  'Seguimiento',
  SeguimientoSchema
);