#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
recuperar() { docker compose start rabbitmq worker-auditoria >/dev/null; }
trap recuperar EXIT INT TERM
docker compose exec -T api npm test
docker compose run --rm -T --no-deps init-rbac node scripts/verificar-tercer-parcial.js
docker compose stop worker-auditoria
docker compose run --rm -T --no-deps init-rbac node scripts/verificar-tercer-parcial.js cola
docker compose start worker-auditoria
docker compose run --rm -T --no-deps init-rbac node scripts/verificar-tercer-parcial.js
mkdir -p .local
docker compose run --rm -T --no-deps -v "$PWD/.local:/estado" init-rbac node scripts/verificar-tercer-parcial.js preparar-offline
docker compose stop rabbitmq
docker compose run --rm -T --no-deps -v "$PWD/.local:/estado" init-rbac node scripts/verificar-tercer-parcial.js offline
# La restauración de ambos servicios se ejecuta al salir.
