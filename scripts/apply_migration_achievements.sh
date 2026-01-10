#!/bin/bash
# Script para aplicar la migración de achievements

set -e

# Leer las variables de entorno
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-analysis_user}
DB_PASSWORD=${DB_PASSWORD:-admin}
DB_DATABASE=${DB_DATABASE:-analysis_db}

echo "Conectando a la base de datos..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_DATABASE"

# Ejecutar la migración
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -f "$(dirname "$0")/migrations/20260108_create_achievements_table.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migración de achievements aplicada correctamente"
else
    echo "❌ Error al aplicar la migración"
    exit 1
fi
