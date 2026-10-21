# Segundo Parcial de Bases de Datos Avanzadas

Implementación sobre `Beca1804/BDpawlyapp`, conservando modelos, campos, ObjectId,
cartillas embebidas y operaciones originales. Un usuario registra varias mascotas.

| Criterio | Evidencia | Puntos |
| --- | --- | ---: |
| Topología Docker | Compose, red bdpawlyapp_privada, puertos y diagrama | 3 |
| RBAC Neo4j | docker/neo4j/rbac.cypher y consultas.cypher | 3 |
| Justificación NoSQL | ARQUITECTURA_SEGUNDO_PARCIAL.md | 3 |
| Gateway GraphQL | src/graphql/schema.graphql y resolvers.js | 3 |
| Mongoose y agregación | Modelos originales, medical.js y transacciones | 3 |
| Caché Redis | medical-cache.js, TTL, DEL y performance.now() | 3 |
| JWT y sesiones | security/auth.js, UUID jti y SET EX | 3 |
| Contexto y revocación | jwt.verify, sesión Redis y HTTP 401 | 3 |
| Total posible | La evaluación corresponde al docente | 24 |

## Cambios

- Se añade Redis para cachear los registros médicos y mantener sesiones temporales.
- Se añaden login, logout, me, CRUD médico y reporte por tipo de registro.
- Se cifran contraseñas con bcrypt y se restringen los recursos privados al propietario.
- Se valida la firma, expiración y sesión del JWT en cada petición autenticada.
- Se corrige el índice `tamanoPromedio` y la ubicación GeoJSON incompleta de veterinarias.
- Se entregan fechas ISO e IDs consistentes en lecturas MongoDB y Redis.
- Se agregan Compose reproducible, secretos locales, seed y pruebas.

El ejemplo contiene Ana con Luna y Max, tres consultas y dos tratamientos en total.
Neo4j sigue siendo una demostración conceptual y no sustituye la autorización de la API.
La clave Redis de una página tiene forma `expediente:mascota:<ObjectId>:v<version>:50:0`.
El TTL predeterminado es 60 segundos; el de sesión es 3600 segundos.

## Evidencia local

El 20 de octubre de 2026 pasaron seis pruebas unitarias y la prueba de integración.
En la integración, seis lecturas Redis registraron 0.051, 0.039, 0.034, 0.038,
0.037 y 0.037 ms; todas inferiores a 1.5 ms. La primera lectura MongoDB registró
0.686 ms. Se mide el GET o la consulta, no el tiempo HTTP completo. Vuelve a medir
en la presentación y muestra todas las muestras reales.
