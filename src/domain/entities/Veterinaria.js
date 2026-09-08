export class Veterinaria {
  constructor({
    nombre,
    direccion,
    telefono,
    horario,
    servicios = [],
    latitud = null,
    longitud = null
  }) {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre de la veterinaria es obligatorio');
    }

    if (!direccion || direccion.trim() === '') {
      throw new Error('La dirección de la veterinaria es obligatoria');
    }

    if (!telefono || telefono.trim() === '') {
      throw new Error('El teléfono de la veterinaria es obligatorio');
    }

    if (!Array.isArray(servicios)) {
      throw new Error('Los servicios deben enviarse como una lista');
    }

    this.nombre = nombre.trim();
    this.direccion = direccion.trim();
    this.telefono = telefono.trim();
    this.horario = horario;
    this.servicios = servicios;
    this.latitud = latitud;
    this.longitud = longitud;
  }
}