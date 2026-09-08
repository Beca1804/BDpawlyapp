import mongoose from 'mongoose';

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del usuario es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [100, 'El nombre es demasiado largo']
    },

    correo: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'El correo electrónico no tiene un formato válido'
      ]
    },

    telefono: {
      type: String,
      trim: true,
      default: ''
    },

    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      validate: {
        validator: function (valor) {
          return /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(valor);
        },
        message: 'La contraseña debe contener al menos un carácter especial'
      }
    },

    fotoPerfil: {
      type: String,
      trim: true,
      default: ''
    },

    ciudad: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre de la ciudad es demasiado largo'],
      default: ''
    },

    estado: {
      type: String,
      enum: {
        values: ['ACTIVO', 'INACTIVO', 'BLOQUEADO'],
        message: 'El estado del usuario no es válido'
      },
      default: 'ACTIVO'
    },

    rol: {
      type: String,
      enum: {
        values: ['USUARIO', 'ADMIN'],
        message: 'El rol del usuario no es válido'
      },
      default: 'USUARIO'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const UsuarioModel = mongoose.model('Usuario', UsuarioSchema);