export class RegistroMedico {
  constructor({
    perroId,
    tipoRegistro,
    descripcion,
    fechaRegistro = new Date(),
    observaciones = ''
  }) {
    if (!perroId) {
      throw new Error('El perro es obligatorio para crear un registro médico');
    }

    if (!tipoRegistro || tipoRegistro.trim() === '') {
      throw new Error('El tipo de registro médico es obligatorio');
    }

    if (!descripcion || descripcion.trim() === '') {
      throw new Error('La descripción del registro médico es obligatoria');
    }

    const fecha = new Date(fechaRegistro);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha del registro médico no es válida');
    }

    this.perroId = perroId;
    this.tipoRegistro = tipoRegistro.trim();
    this.descripcion = descripcion.trim();
    this.fechaRegistro = fecha;
    this.observaciones = observaciones;
  }
}