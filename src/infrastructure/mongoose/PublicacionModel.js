import mongoose from 'mongoose';

const ComentarioSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario del comentario es obligatorio']
    },

    contenido: {
      type: String,
      required: [true, 'El comentario no puede estar vacío'],
      trim: true,
      maxlength: [500, 'El comentario es demasiado largo']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const PublicacionSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario es obligatorio'],
      index: true
    },

    perroId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perro',
      required: [true, 'El perro relacionado es obligatorio'],
      index: true
    },

    descripcion: {
      type: String,
      required: [true, 'La descripción de la publicación es obligatoria'],
      trim: true,
      maxlength: [2000, 'La descripción es demasiado larga']
    },

    imagenes: {
      type: [String],
      default: [],
      validate: {
        validator: function (imagenes) {
          return Array.isArray(imagenes);
        },
        message: 'Las imágenes deben almacenarse como una lista'
      }
    },

    ubicacionTexto: {
      type: String,
      trim: true,
      maxlength: [200, 'La ubicación es demasiado larga'],
      default: ''
    },

    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Usuario'
        }
      ],
      default: []
    },

    comentarios: {
      type: [ComentarioSchema],
      default: []
    },

    estado: {
      type: String,
      enum: {
        values: ['PUBLICADA', 'OCULTA', 'ELIMINADA'],
        message: 'El estado de la publicación no es válido'
      },
      default: 'PUBLICADA'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

PublicacionSchema.index({ usuarioId: 1, createdAt: -1 });

PublicacionSchema.index({ perroId: 1, createdAt: -1 });

PublicacionSchema.index({ createdAt: -1 });

export const PublicacionModel = mongoose.model(
  'Publicacion',
  PublicacionSchema
);