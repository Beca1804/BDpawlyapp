# Validación local del tercer parcial

Fecha: 19 de noviembre de 2026.

- Siete pruebas automatizadas aprobadas: selección de campos del evento, identificadores, rechazo de credenciales en campos de identificadores, validación de eventos, confirmación AMQP con espera agotada y recuperación, y geometría opcional de veterinarias.
- Neo4j: catálogo con tres roles, trece rutas, nueve nodos de menú, herencia sin ciclos y restricciones únicas verificadas por esquema.
- Autorización: TUTOR recibe HTTP 403 y no escribe; ADMIN accede directamente y SUPER_ADMIN accede por herencia a la creación de razas.
- Frontend: en Firefox, TUTOR ve Mi cuenta y Cuidado; SUPER_ADMIN también ve Administración. Se comprobó el rechazo y la creación autorizada desde la pantalla.
- RabbitMQ: cola durable, mensajes persistentes y payload limitado a los seis campos del evento, sin contraseñas, hashes ni JWT completos.
- ScyllaDB: evento del login consultado por jti, clave compuesta y agrupamiento descendente verificados; commitlog_sync activo en batch; mensajes Ready y Unacked en cero al finalizar el consumo.
- Caída real del broker: una sesión previa, un login nuevo y las consultas de mascotas y razas continuaron respondiendo. Se restauraron RabbitMQ y el worker.
- Registro de cuenta nueva y asignación del rol TUTOR comprobados. Creación autorizada de veterinaria sin coordenadas comprobada.

La batería se repite con `sh scripts/defensa.sh`. Las claves de prueba permanecen en archivos locales excluidos de Git. No se modificaron los respaldos ni se eliminaron los volúmenes existentes.
