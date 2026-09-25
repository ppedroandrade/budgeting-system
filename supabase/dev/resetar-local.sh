#!/usr/bin/env bash
# SÓ PARA TESTES LOCAIS: recria o banco "postgres" do zero num Postgres local
# (porta 54322) e aplica o schema.sql. O serviço de login (Supabase Auth /
# GoTrue) precisa rodar as migrações dele entre os passos 1 e 2 — este script
# espera que o executável esteja em $AUTH_BIN com as variáveis em $AUTH_ENV.
set -euo pipefail
cd "$(dirname "$0")"
# Uso: resetar-local.sh [nome-do-banco]   (padrão: postgres; os testes usam "teste")
DB="${1:-postgres}"
PSQL="psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 54322 -U postgres"

$PSQL -d template1 -c "drop database if exists $DB with (force)" -c "create database $DB"
$PSQL -d "$DB" -f 01-papeis-supabase.sql

# Migrações do Auth (cria auth.users, auth.uid() etc.)
( set -a; . "$AUTH_ENV"; set +a
  DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:54322/$DB?sslmode=disable" "$AUTH_BIN" migrate )

$PSQL -d "$DB" -f 02-storage-simulado.sql
$PSQL -d "$DB" -f ../schema.sql
echo "Banco local \"$DB\" recriado."
