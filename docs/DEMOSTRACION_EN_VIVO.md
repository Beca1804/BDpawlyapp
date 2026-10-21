# BDpawlyapp — Demostración en vivo del Segundo Parcial

Repositorio: `https://github.com/Beca1804/BDpawlyapp`.
Rama: `feature/segundo-parcial-redis-expedientes`.
Duración sugerida: 12–15 minutos. Usa dos terminales, el editor y Apollo Sandbox.
Los comandos de terminal son para zsh en esta Mac. Usa **IDs ObjectId como cadenas**,
no los números ni las consultas del repositorio anterior.

## 0. Preparación antes de compartir pantalla

En la primera terminal:

```bash
cd /Users/leslie_sosa/Documents/BDpawlyapp
docker compose up -d --build --wait
docker compose ps -a
curl -s http://localhost:4002/health
```

**Mostrar:** `{"status":"ok"}`; API, MongoDB, Redis y Neo4j saludables.
`mongo-setup` debe aparecer `Exited (0)`: ya terminó de preparar el replica set.
La red se llama `bdpawlyapp_privada`. Los puertos internos siguen siendo 4000,
27017, 6379, 8001, 7474 y 7687.

En esta Mac abre **http://localhost:4002/**. La configuración local ya habilita
Sandbox. Si necesitas habilitarlo en otra instalación, cambia `.env`:

```dotenv
GRAPHQL_INTROSPECTION=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4002,https://studio.apollographql.com,https://sandbox.embed.apollographql.com
```

Aplica `docker compose up -d --wait`. En una instalación con `API_PORT=4000`,
cambia 4002 por 4000 en esta guía y en el origen local de CORS.

La cuenta demo ya está preparada en esta computadora. Abre privadamente
`.demo-credentials.txt` y toma el correo y `password`; no compartas ese archivo.
En otra instalación, `docker compose exec api npm run seed:demo` crea la cuenta y
muestra la contraseña una vez. Repetirlo no cambia ni restablece los datos.

En la segunda terminal deja los logs abiertos:

```bash
cd /Users/leslie_sosa/Documents/BDpawlyapp
docker compose logs --tail=0 -f api
```

**Decir:** “Un usuario registra varias mascotas. MongoDB conserva sus datos y
expedientes; Redis guarda copias temporales de los expedientes y las sesiones.
Neo4j representa conceptualmente roles y permisos”.

## 1. Login y usuario con varias mascotas

En Sandbox, sin header Authorization, ejecuta:

```graphql
mutation Login($correo: String!, $password: String!) {
  login(correo: $correo, password: $password) {
    token
    usuario { id nombre }
  }
}
```

Variables; reemplaza la contraseña por la guardada localmente:

```json
{"correo":"demo.parcial2@pawly.example","password":"TU_PASSWORD_LOCAL"}
```

Copia el token completo y configura Headers:

```json
{"Authorization":"Bearer PEGA_EL_TOKEN_COMPLETO"}
```

Ejecuta:

```graphql
query CuentaYMascotas {
  me { id nombre }
  listarPerros { id nombre usuarioId }
}
```

**Mostrar:** Ana Demo, Luna y Max, con el mismo `usuarioId`.
Copia el ID real de Luna. En la primera terminal:

```bash
read 'PAWLY_MASCOTA?Pega el ID de Luna: '
```

Guarda esa terminal abierta: se reutiliza la variable en los siguientes pasos.

## 2. Cache-Aside y comparación de latencia

**Abre en el editor:** `src/services/medical-cache.js` y `src/services/medical.js`.
Señala `redisClient.get(key)`, la llamada `load()` a Mongoose y
`redisClient.set(key, JSON.stringify(rows), { EX: seconds })`.

**Decir:** “Primero verifico que la mascota pertenezca al usuario. Si Redis no tiene
su expediente, lo leo de MongoDB y guardo una copia con TTL de 60 segundos”.

Para forzar una lectura inicial, elimina únicamente las páginas cacheadas de Luna:

```bash
docker compose exec -T -e DEMO_PET_ID="$PAWLY_MASCOTA" bda-redis-stack sh -c '
  export REDISCLI_AUTH="$REDIS_PASSWORD"
  redis-cli --scan --pattern "expediente:mascota:${DEMO_PET_ID}:v*:*" |
  while IFS= read -r key; do redis-cli DEL "$key"; done
'
```

Esto no borra documentos MongoDB. En Sandbox ejecuta dos veces seguidas:

```graphql
query Expediente($perroId: ID!) {
  listarRegistrosMedicos(perroId: $perroId, limit: 50, offset: 0) {
    id tipoRegistro descripcion fechaRegistro
  }
}
```

Variables: sustituye el marcador por el ObjectId real, conservando las comillas:

```json
{"perroId":"ID_REAL_DE_LUNA"}
```

**Mostrar en logs:** primero `"fuente":"MongoDB"` y después `"fuente":"Redis"`.
El evento se llama `expediente_lectura`. El campo `ms` se obtiene con
`performance.now()`. La lectura Redis debe registrar **menos de 1.5 ms**.

**Decir:** “Se mide la consulta a MongoDB o el GET de la página en Redis; no es el
tiempo completo de HTTP ni incluye la autenticación”. `redis_miss_ms` no es un hit.
Muestra las mediciones actuales. Si una supera el umbral, conserva esa muestra,
revisa la carga de Docker y vuelve a medir; no hay una garantía bajo cualquier carga.

Para mostrar las claves y su TTL inmediatamente después de la consulta:

```bash
docker compose exec -T -e DEMO_PET_ID="$PAWLY_MASCOTA" bda-redis-stack sh -c '
  export REDISCLI_AUTH="$REDIS_PASSWORD"
  redis-cli --scan --pattern "expediente:mascota:${DEMO_PET_ID}:v*:*" |
  while IFS= read -r key; do
    printf "Clave: %s\nTTL: " "$key"
    redis-cli TTL "$key"
  done
'
```

**Esperado:** TTL positivo, hasta 60 segundos con la configuración predeterminada.
Las claves `:version` y `:claves` son metadatos, no páginas del expediente.

## 3. Escrituras e invalidación de caché

Primero ejecuta `Expediente` para tener una copia cacheada. Después crea un registro temporal:

```graphql
mutation CrearTemporal($perroId: ID!) {
  crearRegistroMedico(input: {
    perroId: $perroId
    tipoRegistro: "CONSULTA"
    descripcion: "Registro temporal de la presentacion"
    observaciones: "Eliminar al terminar"
  }) { id descripcion }
}
```

Usa las mismas variables `perroId`. **Anota el `id` del registro nuevo.**
Antes de consultar otra vez, ejecuta el comando que lista las claves y comprueba
que la página anterior desapareció. Después ejecuta `Expediente` dos veces:
la primera lectura muestra el nuevo registro desde MongoDB y la siguiente usa Redis.

**Abre:** `invalidateHistory` en `src/services/medical-cache.js`. Señala
`redisClient.del(keys)` y el incremento de versión. En `medical.js` muestra que
crear, actualizar y eliminar llaman a esa función después del commit.

**Decir:** “La escritura invalida las páginas de esta mascota. La versión evita
reutilizar una página anterior en una lectura concurrente. El expediente de Max
mantiene su propia caché”.

Modifica únicamente el evento temporal:

```graphql
mutation EditarTemporal($id: ID!) {
  actualizarRegistroMedico(id: $id, input: {
    descripcion: "Registro temporal actualizado"
  }) { id descripcion }
}
```

Variables, con el ID real del evento temporal:

```json
{"id":"ID_REAL_DEL_REGISTRO_TEMPORAL"}
```

Ejecuta de nuevo `Expediente` con sus propias variables `perroId`; debe mostrar
la descripción nueva y una lectura MongoDB. Puedes repetir la inspección de claves
antes de esa lectura para demostrar también el DEL en la modificación.

## 4. SDL, resolvers y agregación analítica

**Archivos que debes abrir:**

| Archivo | Qué explicar |
| --- | --- |
| `src/graphql/schema.graphql` | `RegistroMedico`, inputs, queries y mutations tipadas |
| `src/graphql/resolvers.js` | Conexión de resolvers, permisos y fechas ISO |
| `src/services/medical.js` | Operaciones médicas y `RegistroMedicoModel.aggregate` |
| `src/infrastructure/mongoose/RegistroMedicoModel.js` | Campos, enumeraciones, validaciones e índices |

Ejecuta:

```graphql
query Reporte($perroId: ID!) {
  luna: resumenExpedientes(perroId: $perroId) {
    tipoRegistro cantidad
  }
  todasMisMascotas: resumenExpedientes {
    tipoRegistro cantidad
  }
}
```

Variables: `perroId` con el ObjectId de Luna.

| Estado original | CONSULTA | TRATAMIENTO | Total |
| --- | ---: | ---: | ---: |
| Luna | 2 | 1 | 3 |
| Max | 1 | 1 | 2 |
| Ambas | 3 | 2 | 5 |

Con el registro temporal todavía creado, Luna tiene tres consultas y un tratamiento;
el total es cuatro consultas y dos tratamientos. Las vacunas pertenecen a la
cartilla de `Perro`; no se mezclan automáticamente con este reporte médico.

**Señala y explica:** `$match` restringe mascotas autorizadas, `$group` cuenta con
`$sum: 1`, `$project` entrega el tipo y cantidad, `$sort` ordena el reporte.

## 5. Persistencia y transacciones MongoDB

**Abre:** `src/infrastructure/database/mongo.js`, función `transaccion`, y
las mutaciones en `src/services/medical.js`. Señala `startSession`,
`withTransaction` y la sesión aplicada a las escrituras.

**Decir:** “MongoDB es la fuente persistente. El replica set rs0 permite transacciones
para confirmar o revertir operaciones. Redis se invalida después de confirmar;
no es una transacción distribuida. Un solo nodo no ofrece alta disponibilidad”.

Para mostrar la base y su relación usuario-mascota sin revelar contraseñas:

```bash
docker compose exec -T -e DEMO_PET_ID="$PAWLY_MASCOTA" bda-mongodb mongosh --quiet --eval '
  const pawly=db.getSiblingDB("pawly");
  if(!pawly.auth("pawly",process.env.MONGO_PASSWORD)) quit(1);
  const dog=pawly.perros.findOne({_id:ObjectId(process.env.DEMO_PET_ID)});
  if(!dog) throw new Error("Mascota no encontrada");
  printjson({mascota:dog.nombre,usuarioId:dog.usuarioId});
  printjson(pawly.usuarios.findOne({_id:dog.usuarioId},{nombre:1,correo:1}));
  const hello=pawly.runCommand({hello:1});
  printjson({replicaSet:hello.setName,primario:hello.isWritablePrimary});
'
```

**Mostrar:** Luna y su propietario; `replicaSet: "rs0"`, `primario: true`.
Si piden demostrar rollback, abre `scripts/integration-test.js`: la prueba escribe
un registro médico y una actividad en una transacción, provoca un error y comprueba
que ninguna escritura quedó guardada. Puedes ejecutar esa prueba en el paso 9.

## 6. Eliminar el registro temporal

Primero consulta `Expediente` para asegurar una página cacheada. Después:

```graphql
mutation EliminarTemporal($id: ID!) {
  eliminarRegistroMedico(id: $id)
}
```

Usa únicamente el ID temporal. **Esperado:** `true`. Comprueba que la página
cacheada desapareció antes de leer otra vez. Repite `Expediente` y `Reporte`:
la primera lectura vuelve a MongoDB y el reporte regresa a cinco registros,
si no se han hecho otros cambios. No elimines los datos originales.

## 7. JWT con jti y sesión Redis con TTL

**Abre:** `src/security/auth.js`, función `login`. Señala `randomUUID()`, `jwt.sign`,
`jwtid: jti`, `expiresIn` y:

```javascript
await redisClient.set(`sesion:${jti}`, user.id, { EX: seconds });
```

**Decir:** “Cada inicio de sesión tiene un UUID distinto. Redis asocia la sesión al
usuario durante el mismo tiempo que el JWT: 3600 segundos por defecto”.

En la primera terminal obtiene el jti sin imprimir el token completo:

```bash
PAWLY_JTI=$(python3 - <<'PY'
import base64,getpass,json
token=getpass.getpass('Pega el JWT vigente (entrada oculta): ')
part=token.split('.')[1]
print(json.loads(base64.urlsafe_b64decode(part+'='*(-len(part)%4)))['jti'])
PY
)
```

Solo se decodifica para inspeccionarlo. La validación criptográfica ocurre en el backend.

```bash
docker compose exec -T -e DEMO_JTI="$PAWLY_JTI" bda-redis-stack sh -c '
  export REDISCLI_AUTH="$REDIS_PASSWORD"
  printf "Usuario: "; redis-cli GET "sesion:$DEMO_JTI"
  printf "TTL: "; redis-cli TTL "sesion:$DEMO_JTI"
'
```

**Esperado:** el ObjectId de Ana y un TTL positivo que disminuye con el tiempo.

## 8. Logout y rechazo inmediato

Antes de cerrar sesión, consulta:

```graphql
query VerSesion { me { id nombre } }
```

Después:

```graphql
mutation CerrarSesion { logout }
```

**Esperado:** `true`. Repite el comando Redis: GET ya no devuelve usuario y TTL es `-2`.
Repite `VerSesion` con el mismo token en Headers: debe fallar con
`UNAUTHENTICATED` y HTTP **401**.

Si necesitas mostrar el HTTP directamente:

```bash
python3 - <<'PY'
import getpass,json,urllib.request,urllib.error
token=getpass.getpass('Pega el mismo JWT revocado (entrada oculta): ')
r=urllib.request.Request('http://localhost:4002/',
    data=json.dumps({'query':'{ me { id nombre } }'}).encode(),
    headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
try:
    with urllib.request.urlopen(r,timeout=15) as response:
        print('HTTP',response.status);print(response.read().decode())
except urllib.error.HTTPError as error:
    print('HTTP',error.code);print(error.read().decode())
PY
```

**Abre:** `contexto` y `logout` en `src/security/auth.js`.
Señala `jwt.verify`, comprobación de `sesion:<jti>`, cuenta activa y `redisClient.del`.

**Decir:** “Una firma válida no basta. El JWT aún puede no haber vencido, pero si su
sesión se eliminó, el contexto lo rechaza inmediatamente”.
Para otro login, quita primero Authorization y después coloca el token nuevo.

## 9. Pruebas y Neo4j

Pruebas automáticas, solo en desarrollo:

```bash
docker compose exec -T api npm test
docker compose exec -T api npm run test:integration
```

La integración usa un servidor interno aislado, crea y limpia sus propios datos y
muestra latencias. Incluye permisos, CRUD médico, rollback, expiración y logout.

Para demostrar el grafo RBAC:

```bash
docker compose exec -T bda-neo4j sh -c 'cypher-shell -u neo4j -p "$PAWLY_NEO4J_PASSWORD" -f /scripts/rbac.cypher'
```

Abre **http://localhost:7476/**, Bolt **bolt://localhost:7689**, usuario `neo4j`
y contraseña local del `.env`. En otra instalación los puertos predeterminados
son 7474 y 7687. Ejecuta por separado en Neo4j Browser:

```cypher
MATCH camino=()-[]->() RETURN camino;
```

```cypher
MATCH (u:Usuario {id:'demo-admin'})-[:TIENE_ROL]->(:Rol)
      -[:HEREDA_DE*0..]->(:Rol)-[:TIENE_PERMISO]->(p:Permiso)
RETURN DISTINCT u.nombre, p.nombre;
```

```cypher
MATCH (:Usuario {id:'demo-ana'})-[:TIENE_ROL]->(:Rol)
      -[:HEREDA_DE*0..]->(:Rol)
      -[:TIENE_PERMISO]->(:Permiso {nombre:'gestionar_catalogos'})
RETURN count(*) > 0 AS permitido;
```

**Esperado:** grafo con roles y mascotas; administrador con permisos propios y heredados;
`false` para Ana gestionando catálogos. El grafo es conceptual: no decide los accesos
de la API. Index-Free Adjacency permite recorrer referencias entre vecinos después
de localizar el nodo inicial, sin buscar cada vecino mediante un índice global.

## Lista final de evidencias

- Primera consulta MongoDB, siguientes Redis y GET menor de 1.5 ms.
- Clave de expediente con TTL e invalidación al crear, editar y borrar.
- SDL tipado, resolvers, modelo Mongoose y agregación útil.
- Persistencia en MongoDB y transacciones con rollback comprobado.
- JWT con UUID jti, sesión con TTL, DEL al cerrar y HTTP 401 con el mismo token.
- Usuario con dos mascotas y acceso privado por propietario.

Elimina solo el evento temporal. Ctrl+C detiene el seguimiento de logs, no los
contenedores. No ejecutes `docker compose down -v`: borraría los datos del proyecto.
Si una sesión o caché expira durante la explicación, repite el login o la consulta,
y actualiza las variables correspondientes; no cambies el comportamiento para simular resultados.
