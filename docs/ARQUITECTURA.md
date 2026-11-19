# Arquitectura y catálogo RBAC

El Gateway valida JWT y sesión en Redis, consulta roles en Neo4j y ejecuta las operaciones autorizadas en MongoDB. Las mutaciones de mascotas también validan propiedad. La autorización consulta el grafo; el rol incluido en el JWT no sustituye esa decisión.

## Secuencia integral

```mermaid
sequenceDiagram
  actor U as Usuario
  participant G as GraphQL
  participant M as MongoDB
  participant R as Redis
  participant N as Neo4j
  participant Q as RabbitMQ
  participant W as Worker
  participant S as ScyllaDB
  U->>G: login
  G->>M: comprobar usuario y bcrypt
  M-->>G: usuario activo
  G->>R: guardar sesion jti con TTL
  G->>Q: publicar evento persistente
  Q-->>G: confirmación o espera agotada
  G-->>U: token y usuario
  par Petición del usuario
    U->>G: mutación con JWT
    G->>R: validar sesión
    G->>M: cargar usuario
    G->>N: HAS_ROLE e INHERITS de longitud variable
    N-->>G: permiso efectivo
    alt autorizado
      G->>M: validar propiedad y guardar
      G-->>U: resultado
    else denegado
      G-->>U: FORBIDDEN 403
    end
  and Auditoría en segundo plano
    Q->>W: entregar evento con prefetch 50
    W->>S: INSERT preparado
    alt escritura sincronizada a disco
      S-->>W: confirmación
      W->>Q: ack
    else error transitorio
      W->>Q: nack y reentrega
    end
  end
```

## Matriz de permisos

D es directo, H heredado y X denegado. La clave de cada permiso es path más method más operation.

| Ruta | Tipo | Operación | TUTOR | ADMIN | SUPER_ADMIN | Menú |
|---|---|---|---|---|---|---|
| /mi-perfil | QUERY | miPerfil | D | H | H | Mi cuenta / Mi perfil |
| /mascotas | QUERY | misMascotas | D | H | H | Mi cuenta / Mis mascotas |
| /actividad/:mascotaId | QUERY | resumenPaseos | D | H | H | Cuidado / Actividad |
| /salud/historial/:mascotaId | QUERY | historialMedico | D | H | H | Cuidado / Historial médico |
| /veterinaria/citas | QUERY | listarCitasPorPerro | D | H | H | Cuidado / Citas veterinarias |
| /admin/usuarios | QUERY | listarUsuarios | X | D | H | Administración / Usuarios |
| /mascotas/crear | MUTATION | crearMascota | D | H | H | Acción interna |
| /actividad/registrar | MUTATION | registrarActividad | D | H | H | Acción interna |
| /salud/vacunas/agregar | MUTATION | agregarVacuna | D | H | H | Acción interna |
| /veterinaria/citas/crear | MUTATION | crearCitaVeterinaria | D | H | H | Acción interna |
| /comunidad/publicar | MUTATION | crearPublicacion | D | H | H | Acción interna |
| /admin/razas/crear | MUTATION | crearRaza | X | D | H | Acción interna |
| /admin/veterinarias/crear | MUTATION | crearVeterinaria | X | D | H | Acción interna |

`miPerfil` corresponde al resolver obtenerUsuario; `misMascotas` a las consultas de mascotas; `crearMascota` al resolver crearPerro. MenuNode tiene título, icono, orden y padre. CAN_VIEW_MENU filtra opciones, HAS_CHILD organiza grupos y NAVIGATES_TO determina el destino. Las restricciones únicas cubren User.id, Role.name, MenuNode.id y la combinación Route(path, method, operation).

## Auditoría durable

La cola se declara durable y se publican mensajes persistentes con confirmaciones del broker. El productor selecciona y valida únicamente identificadores y campos de evento. El worker rechaza mensajes inválidos, utiliza sentencias preparadas y conserva el evento_id para que una reentrega escriba sobre la misma clave. ScyllaDB particiona por día UTC y tipo, y agrupa por timestamp y timeuuid descendentes. La demostración usa una réplica local y commitlog en modo batch.

Referencias de implementación: [confirmaciones de RabbitMQ](https://www.rabbitmq.com/docs/confirms) y [configuración de commitlog de ScyllaDB](https://docs.scylladb.com/manual/stable/reference/configuration-parameters.html).
