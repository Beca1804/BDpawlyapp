export class Usuario {
  constructor({
    nombre,
    correo,
    telefono = '',
    password,
    fotoPerfil = '',
    ciudad = '',
    estado = 'ACTIVO',
    rol = 'USUARIO',
    fechaRegistro = new Date()
  }) {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre del usuario es obligatorio');
    }

    if (nombre.trim().length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres');
    }

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new Error('El correo electrónico no es válido');
    }

    if (!password || password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) {
      throw new Error(
        'La contraseña debe contener al menos un carácter especial'
      );
    }

    const estadosValidos = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'];

    if (!estadosValidos.includes(estado)) {
      throw new Error('El estado del usuario no es válido');
    }

    const rolesValidos = ['USUARIO', 'ADMIN'];

    if (!rolesValidos.includes(rol)) {
      throw new Error('El rol del usuario no es válido');
    }

    const fecha = new Date(fechaRegistro);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha de registro no es válida');
    }

    this.nombre = nombre.trim();
    this.correo = correo.toLowerCase().trim();
    this.telefono = telefono.trim();
    this.password = password;
    this.fotoPerfil = fotoPerfil;
    this.ciudad = ciudad.trim();
    this.estado = estado;
    this.rol = rol;
    this.fechaRegistro = fecha;
  }
}