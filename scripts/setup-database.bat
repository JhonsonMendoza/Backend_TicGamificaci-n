@echo off
echo ================================
echo  CONFIGURACION DE BASE DE DATOS
echo ================================
echo.

echo Verificando si PostgreSQL esta instalado...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL no esta instalado o no esta en el PATH
    echo Por favor instala PostgreSQL desde: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo PostgreSQL encontrado!
echo.

echo Iniciando configuracion de la base de datos...
echo.

echo IMPORTANTE: Te pedira la contraseña del usuario 'postgres'
echo.

psql -U postgres -f "%~dp0database\setup.sql"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo la configuracion de la base de datos
    echo Verifica que:
    echo 1. PostgreSQL este ejecutandose
    echo 2. La contraseña del usuario 'postgres' sea correcta
    echo 3. Tengas permisos de administrador
    pause
    exit /b 1
)

echo.
echo ================================
echo  CONFIGURACION COMPLETADA
echo ================================
echo.
echo La base de datos 'analysis_db' ha sido creada correctamente
echo Usuario: analysis_user
echo Contraseña: admin
echo.
echo Puedes iniciar el servidor backend con: npm run start:dev
echo.
pause