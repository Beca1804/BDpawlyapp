export class CitaVeterinaria {
  constructor({
    perroId,
    veterinariaId,
    fechaHora,
    motivo,
    estado = 'PENDIENTE',
    notas = ''
  }) {
    if (!perroId) {
      throw new Error('El perro es obligatorio para registrar una cita');
    }

    if (!veterinariaId) {
      throw new Error('La veterinaria es obligatoria para registrar una cita');
    }

    const fecha = new Date(fechaHora);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha y hora de la cita no son válidas');
    }

    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de la cita es obligatorio');
    }

    const estadosValidos = [
      'PENDIENTE',
      'CONFIRMADA',
      'COMPLETADA',
      'CANCELADA'
    ];

    if (!estadosValidos.includes(estado)) {
      throw new Error('El estado de la cita no es válido');
    }

    this.perroId = perroId;
    this.veterinariaId = veterinariaId;
    this.fechaHora = fecha;
    this.motivo = motivo.trim();
    this.estado = estado;
    this.notas = notas.trim();
  }
}