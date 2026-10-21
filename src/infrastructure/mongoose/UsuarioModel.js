
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

    // CONTRASEÑA PROTEGIDA
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      select: false
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

// ========================================
// GENERAR HASH ANTES DE GUARDAR
// ========================================

UsuarioSchema.pre('save', async function () {

  // Solo generar hash cuando la contraseña sea nueva o cambie
  if (!this.isModified('password')) return;

  // Validar contraseña original
  if (
    typeof this.password !== 'string' ||
    this.password.length < 8 ||
    !/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(this.password)
  ) {
    throw new Error(
      'La contraseña debe tener mínimo 8 caracteres y al menos un carácter especial'
    );
  }

  // Convertir la contraseña en un hash bcrypt
  this.password = await bcrypt.hash(this.password, 12);
});

// ========================================
// COMPARAR CONTRASEÑA DURANTE LOGIN
// ========================================

UsuarioSchema.methods.compararPassword = async function (password) {
  if (!this.password) return false;

  return bcrypt.compare(password, this.password);
};

// ========================================
// EXPORTAR MODELO
// ========================================

export const UsuarioModel = mongoose.model('Usuario', UsuarioSchema);
