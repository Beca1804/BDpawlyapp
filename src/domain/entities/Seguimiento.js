export class Seguimiento {
  constructor({
    seguidorId,
    seguidoId,
    fechaSeguimiento = new Date()
  }) {
    if (!seguidorId) {
      throw new Error('El usuario seguidor es obligatorio');
    }

    if (!seguidoId) {
      throw new Error('El usuario seguido es obligatorio');
    }

    if (seguidorId.toString() === seguidoId.toString()) {
      throw new Error('Un usuario no puede seguirse a sí mismo');
    }

    const fecha = new Date(fechaSeguimiento);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha de seguimiento no es válida');
    }

    this.seguidorId = seguidorId;
    this.seguidoId = seguidoId;
    this.fechaSeguimiento = fecha;
  }
}