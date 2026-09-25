#!/usr/bin/env bash
# SÓ PARA TESTES LOCAIS: recria o banco "postgres" do zero num Postgres local
# (porta 54322) e aplica o schema.sql. O serviço de login (Supabase Auth /
# GoTrue) precisa rodar as migrações dele entre os passos 1 e 2 — este script
# espera que o executável esteja em $AUTH_BIN com as variáveis em $AUTH_ENV.
set -euo pipefail
cd "$(dirname "$0")"
PSQL="psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 54322 -U postgres"

$PSQL -d template1 -c "drop database if exists postgres with (force)" -c "create database postgres"
$PSQL -d postgres -f 01-papeis-supabase.sql

# Migrações do Auth (cria auth.users, auth.uid() etc.)
( set -a; . "$AUTH_ENV"; set +a; "$AUTH_BIN" migrate )

$PSQL -d postgres -f 02-storage-simulado.sql
$PSQL -d postgres -f ../schema.sql
echo "Banco local recriado."
