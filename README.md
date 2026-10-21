# BDpawlyapp — Segundo Parcial

Repositorio: https://github.com/Beca1804/BDpawlyapp
Rama de trabajo: `feature/segundo-parcial-redis-expedientes`.

Se conserva la estructura original: entidades de dominio, modelos Mongoose y
GraphQL con IDs ObjectId. Un usuario tiene varias mascotas. Las vacunas permanecen
embebidas en la cartilla del perro; el expediente se consulta mediante registros
médicos relacionados por `perroId`.

MongoDB conserva los datos; Redis Stack cachea los expedientes con Cache-Aside,
TTL e invalidación y almacena sesiones JWT revocables. Neo4j contiene un ejemplo
RBAC conceptual; la API autoriza según el propietario y el rol del usuario en MongoDB.

## Inicio

Requisitos: Docker y Compose.

```bash
git clone https://github.com/Beca1804/BDpawlyapp.git
cd BDpawlyapp
# Cuando esta rama esté publicada:
git switch feature/segundo-parcial-redis-expedientes
cp .env.example .env
# Sustituir las contraseñas y JWT_SECRET por secretos propios.
docker compose up -d --build --wait
docker compose exec api npm run seed:demo
```

El seed devuelve la contraseña aleatoria una vez. Repetirlo no cambia la cuenta
ni duplica los datos. Guarda su salida fuera de Git. No hay administradores ni
contraseñas públicas predeterminadas. El registro crea solo usuarios `USUARIO`;
los catálogos requieren `ADMIN`. Un responsable puede asignar ese rol directamente
en la base a una cuenta conocida; no se acepta en el registro GraphQL.

API predeterminada: http://localhost:4000/. Para Apollo Sandbox, configura
`GRAPHQL_INTROSPECTION=true` y agrega el origen local a `CORS_ORIGINS` en `.env`.
En esta computadora la API usa **4002**, MongoDB **27019**, Redis **6381**,
RedisInsight **8003**, Neo4j Browser **7476** y Bolt **7689**, para convivir con
el proyecto anterior. Los puertos internos permanecen estándar.

El proyecto Compose `bdpawlyapp` y la red `bdpawlyapp_privada` tienen sus propios
volúmenes. `mongo-setup` debe terminar con código 0; los otros cuatro servicios
quedan saludables. El replica set de un nodo habilita transacciones, no alta disponibilidad.

## Entrega y presentación

- [Arquitectura y teoría](docs/ARQUITECTURA_SEGUNDO_PARCIAL.md).
- [Guion con comandos para presentar](docs/DEMOSTRACION_EN_VIVO.md).
- [Correspondencia con la rúbrica](docs/SEGUNDO_PARCIAL.md).

Operaciones añadidas: `login`, `logout`, `me`, `crearRegistroMedico`,
`actualizarRegistroMedico`, `eliminarRegistroMedico` y `resumenExpedientes`.
`listarRegistrosMedicos` conserva su nombre y añade `limit` (1–100) y `offset`.
Las listas originales devuelven como máximo 100 registros. Las consultas privadas
requieren `Authorization: Bearer <token>` y quedan restringidas al propietario o ADMIN.
Las publicaciones siguen siendo sociales y consultables por usuarios autenticados.

La caché almacena páginas del expediente por mascota. La cartilla es un campo
separado de `Perro`: agregar una vacuna no modifica los registros médicos cacheados.
Los tipos de registro existentes se conservan (`CONSULTA`, `TRATAMIENTO`, etc.).

## Pruebas

```bash
docker compose exec api npm test
docker compose exec api npm run test:integration
docker compose exec api npm run aggregation
curl http://localhost:4000/health
```

Las pruebas crean y limpian registros temporales en desarrollo. Verifican
operaciones originales, hash de contraseñas, autorización, caché, TTL, invalidación,
agregación, rollback de varios documentos y revocación inmediata con HTTP 401.
Imprimen medidas reales; el requisito de Redis <1.5 ms se debe mostrar en la
computadora de presentación, no es una garantía para cualquier carga.

## Datos anteriores y límites

El Compose nuevo usa volúmenes propios; no importa ni modifica automáticamente
una base anterior. Si conectas una base preexistente, respáldala primero y ejecuta
`docker compose exec api npm run migrate:passwords` para convertir contraseñas
antiguas en texto plano. El login no acepta contraseñas almacenadas sin hash.
Los scripts Mongo crean el usuario de aplicación solo sobre volúmenes nuevos.
Cambiar `.env` no cambia por sí solo las contraseñas dentro de bases ya inicializadas.

Las mutaciones médicas usan transacciones MongoDB. La invalidación de Redis sucede
después del commit: no es una transacción distribuida. Si Redis falla durante esa
fase, la API informa un error aunque MongoDB pudiera haber guardado el cambio;
consulta el expediente antes de repetir una escritura. Las escrituras manuales
fuera de la API no invalidan caché. Las clases de dominio se conservan; los resolvers
siguen usando directamente los modelos Mongoose, como en el repositorio original.

Para detener conservando datos: `docker compose down`. No uses `down -v` si necesitas
los datos. Los secretos y las credenciales demo están excluidos de Git y de la imagen.
