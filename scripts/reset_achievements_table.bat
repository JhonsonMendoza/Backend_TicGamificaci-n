@echo off
REM Script para limpiar y recrear la tabla achievements

setlocal enabledelayedexpansion

REM Leer variables de entorno
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_USERNAME set DB_USERNAME=analysis_user
if not defined DB_PASSWORD set DB_PASSWORD=admin
if not defined DB_DATABASE set DB_DATABASE=analysis_db

echo Conectando a la base de datos para limpiar achievements...
echo Host: !DB_HOST!
echo Port: !DB_PORT!
echo Database: !DB_DATABASE!

REM Obtener la ruta del script
set SCRIPT_DIR=%~dp0

REM Primero, dropear la tabla si existe
set PGPASSWORD=!DB_PASSWORD!
psql -h !DB_HOST! -p !DB_PORT! -U !DB_USERNAME! -d !DB_DATABASE! -c "DROP TABLE IF EXISTS achievements CASCADE;"

if !errorlevel! neq 0 (
    echo.
    echo ❌ Error al dropear la tabla achievements
    exit /b 1
)

echo ✅ Tabla achievements eliminada

REM Ahora ejecutar la migración
psql -h !DB_HOST! -p !DB_PORT! -U !DB_USERNAME! -d !DB_DATABASE! -f "!SCRIPT_DIR!..\database\migrations\20260108_create_achievements_table.sql"

if !errorlevel! equ 0 (
    echo.
    echo ✅ Tabla achievements creada correctamente
) else (
    echo.
    echo ❌ Error al crear la tabla achievements
    exit /b 1
)

endlocal
