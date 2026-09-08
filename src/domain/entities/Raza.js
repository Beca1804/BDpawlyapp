export class Raza {
  constructor({
    nombre,
    tamanoPromedio,
    esperanzaVidaMin,
    esperanzaVidaMax,
    paisOrigen = '',
    temperamento = [],
    nivelEnergia = 'MEDIO',
    descripcion = '',
    estado = 'ACTIVA'
  }) {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre de la raza es obligatorio');
    }

    if (!['PEQUEÑO', 'MEDIANO', 'GRANDE'].includes(tamañoPromedio)) {
      throw new Error('El tamaño promedio de la raza no es válido');
    }

    if (esperanzaVidaMin <= 0) {
      throw new Error('La esperanza de vida mínima debe ser mayor que 0');
    }

    if (esperanzaVidaMax < esperanzaVidaMin) {
      throw new Error(
        'La esperanza de vida máxima no puede ser menor que la mínima'
      );
    }

    if (!Array.isArray(temperamento)) {
      throw new Error('El temperamento debe almacenarse como una lista');
    }

    if (!['BAJO', 'MEDIO', 'ALTO'].includes(nivelEnergia)) {
      throw new Error('El nivel de energía no es válido');
    }

    if (!['ACTIVA', 'INACTIVA'].includes(estado)) {
      throw new Error('El estado de la raza no es válido');
    }

    this.nombre = nombre.trim();
    this.tamanoPromedio = tamanoPromedio;
    this.esperanzaVidaMin = esperanzaVidaMin;
    this.esperanzaVidaMax = esperanzaVidaMax;
    this.paisOrigen = paisOrigen.trim();
    this.temperamento = temperamento;
    this.nivelEnergia = nivelEnergia;
    this.descripcion = descripcion.trim();
    this.estado = estado;
  }
}