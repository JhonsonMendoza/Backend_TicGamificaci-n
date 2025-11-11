@echo off
REM Script de instalación de herramientas para Windows

echo 🛠️  Instalando herramientas de análisis de código...

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado. Por favor, instálalo desde https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js encontrado
)

REM Instalar paquetes npm globales
echo 📦 Instalando paquetes npm globales...
npm install -g @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no encontrado. Por favor, instálalo desde https://python.org/
) else (
    echo ✅ Python encontrado
    
    REM Instalar Semgrep
    echo 📦 Instalando Semgrep...
    pip install semgrep
    
    REM Instalar Bandit
    echo 📦 Instalando Bandit...
    pip install bandit
)

REM Verificar Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java no encontrado. Por favor, instala Java 11+ para usar SpotBugs y PMD.
) else (
    echo ✅ Java encontrado
)

REM Verificar Maven
mvn --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Maven no encontrado. Instálalo para análisis de proyectos Java.
) else (
    echo ✅ Maven encontrado
)

echo.
echo 🎉 Instalación completada.
echo Reinicia tu terminal y ejecuta 'npm run start:dev' para iniciar el servidor.
pause