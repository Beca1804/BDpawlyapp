export class Perro {
  constructor({
    nombre,
    raza,
    sexo,
    fechaNacimiento,
    peso,
    tamano,
    color,
    descripcion,
    esterilizado = false,
    metaPasos = 0
  }) {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre del perro es obligatorio');
    }

    if (peso <= 0) {
      throw new Error('El peso del perro debe ser mayor que 0');
    }

    if (metaPasos < 0) {
      throw new Error('La meta de pasos no puede ser negativa');
    }

    const fecha = new Date(fechaNacimiento);

    if (fecha > new Date()) {
      throw new Error('La fecha de nacimiento no puede estar en el futuro');
    }

    this.nombre = nombre;
    this.raza = raza;
    this.sexo = sexo;
    this.fechaNacimiento = fecha;
    this.peso = peso;
    this.tamano = tamano;
    this.color = color;
    this.descripcion = descripcion;
    this.esterilizado = esterilizado;
    this.metaPasos = metaPasos;
  }
}
