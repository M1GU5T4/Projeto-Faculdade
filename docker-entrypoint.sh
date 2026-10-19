#!/bin/bash
set -e

echo "🚀 Iniciando backend..."

# Extrai host e porta do DATABASE_URL
# Formato: mysql://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|mysql://[^@]+@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/[^/]+$|\1|')

echo "⏳ Aguardando MySQL em ${DB_HOST}:${DB_PORT}..."
until nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null; do
    echo "   MySQL ainda não está pronto, aguardando 2s..."
    sleep 2
done
echo "✅ MySQL aceitando conexões TCP!"

# Aguarda mais 3s para o MySQL terminar a inicialização interna
sleep 3

# Roda migrations
echo "🔄 Executando migrations do Prisma..."
npx prisma migrate deploy
echo "✅ Migrations aplicadas!"

# Seed opcional
if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "🌱 Executando seed..."
    npx prisma db seed
fi

echo "🚀 Iniciando servidor na porta 3002..."
exec "$@"
