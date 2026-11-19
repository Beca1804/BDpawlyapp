# PawlyApp

Backend GraphQL para el cuidado de mascotas con MongoDB, sesiones en Redis, autorización RBAC en Neo4j y auditoría mediante RabbitMQ y ScyllaDB.

## Iniciar el proyecto

Requiere Docker Compose y Node.js 22 o posterior para preparar la configuración local.

```sh
node scripts/configurar-local.js
docker compose up -d --build
```

La configuración genera claves locales y conserva las existentes. Los inicializadores preparan el catálogo RBAC y la tabla de auditoría antes de iniciar sus consumidores. Los datos se conservan en volúmenes. No se requiere cargar el respaldo del parcial anterior.

- Aplicación y menú por usuario: http://localhost:8080
- GraphQL y Apollo Sandbox: http://localhost:4000
- Neo4j Browser: http://localhost:7474
- RabbitMQ Management: http://localhost:15672

Las tres cuentas locales son `tutor@pawly.local`, `admin@pawly.local` y `superadmin@pawly.local`. Sus claves y los accesos administrativos están en `.local/cuentas-demo.txt`, excluido de Git. El inicializador solo habilita estas cuentas si se configura `DEMO_PASSWORD`. No usar estas cuentas en producción.

## Pruebas

```sh
docker compose exec -T api npm test
sh scripts/defensa.sh
```

La defensa detiene y vuelve a iniciar el worker y RabbitMQ para comprobar la persistencia y el modo fail-safe. Debe ejecutarse en este entorno local de demostración. Al finalizar restaura ambos servicios. En caso de interrupción se puede recuperar todo con `docker compose up -d`.

El diseño y la matriz de permisos están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
