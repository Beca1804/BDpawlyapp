export class Publicacion {
  constructor({
    usuarioId,
    perroId,
    descripcion,
    imagenes = [],
    ubicacion = '',
    fechaPublicacion = new Date()
  }) {
    if (!usuarioId) {
      throw new Error('El usuario es obligatorio para crear una publicación');
    }

    if (!perroId) {
      throw new Error('La mascota relacionada es obligatoria');
    }

    if (!descripcion || descripcion.trim() === '') {
      throw new Error('La descripción de la publicación es obligatoria');
    }

    if (!Array.isArray(imagenes)) {
      throw new Error('Las imágenes deben enviarse como una lista');
    }

    this.usuarioId = usuarioId;
    this.perroId = perroId;
    this.descripcion = descripcion.trim();
    this.imagenes = imagenes;
    this.ubicacion = ubicacion;
    this.fechaPublicacion = new Date(fechaPublicacion);
  }
}