export class RegistroActividad {
  constructor({
    perroId,
    fecha,
    pasos,
    distancia = 0,
    calorias = 0,
    tiempoActividad = 0
  }) {
    if (!perroId) {
      throw new Error('El perro es obligatorio para registrar actividad');
    }

    if (pasos < 0) {
      throw new Error('La cantidad de pasos no puede ser negativa');
    }

    if (distancia < 0) {
      throw new Error('La distancia no puede ser negativa');
    }

    if (calorias < 0) {
      throw new Error('Las calorías no pueden ser negativas');
    }

    if (tiempoActividad < 0) {
      throw new Error('El tiempo de actividad no puede ser negativo');
    }

    const fechaActividad = new Date(fecha);

    if (Number.isNaN(fechaActividad.getTime())) {
      throw new Error('La fecha de actividad no es válida');
    }

    this.perroId = perroId;
    this.fecha = fechaActividad;
    this.pasos = pasos;
    this.distancia = distancia;
    this.calorias = calorias;
    this.tiempoActividad = tiempoActividad;
  }
}