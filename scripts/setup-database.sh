#!/bin/bash

echo "================================"
echo " CONFIGURACION DE BASE DE DATOS"
echo "================================"
echo ""

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL no está instalado o no está en el PATH"
    echo "Por favor instala PostgreSQL:"
    echo "Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo "macOS: brew install postgresql"
    exit 1
fi

echo "PostgreSQL encontrado!"
echo ""

echo "Iniciando configuración de la base de datos..."
echo ""

echo "IMPORTANTE: Te pedirá la contraseña del usuario 'postgres'"
echo ""

# Ejecutar script de configuración
psql -U postgres -f "$(dirname "$0")/database/setup.sql"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Falló la configuración de la base de datos"
    echo "Verifica que:"
    echo "1. PostgreSQL esté ejecutándose"
    echo "2. La contraseña del usuario 'postgres' sea correcta"
    echo "3. Tengas permisos de administrador"
    exit 1
fi

echo ""
echo "================================"
echo " CONFIGURACION COMPLETADA"
echo "================================"
echo ""
echo "La base de datos 'analysis_db' ha sido creada correctamente"
echo "Usuario: analysis_user"
echo "Contraseña: admin"
echo ""
echo "Puedes iniciar el servidor backend con: npm run start:dev"
echo ""