@echo off
echo ====================================
echo INSTALANDO HERRAMIENTAS DE ANALISIS
echo ====================================

echo.
echo 1. Instalando Semgrep...
pip install semgrep

echo.
echo 2. Verificando Maven (SpotBugs y PMD se instalan via Maven plugins)...
mvn --version

echo.
echo 3. Creando directorios para herramientas...
if not exist "tools" mkdir tools
cd tools

echo.
echo 4. Descargando SpotBugs standalone...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/spotbugs/spotbugs/releases/download/4.8.6/spotbugs-4.8.6.zip' -OutFile 'spotbugs.zip'"

echo.
echo 5. Descargando PMD...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip' -OutFile 'pmd.zip'"

echo.
echo 6. Extrayendo herramientas...
powershell -Command "Expand-Archive -Path 'spotbugs.zip' -DestinationPath 'spotbugs' -Force"
powershell -Command "Expand-Archive -Path 'pmd.zip' -DestinationPath 'pmd' -Force"

cd ..

echo.
echo ====================================
echo INSTALACION COMPLETADA
echo ====================================
echo.
echo SpotBugs: ./tools/spotbugs/spotbugs-4.8.6/bin/spotbugs.bat
echo PMD: ./tools/pmd/pmd-bin-7.0.0/bin/pmd.bat
echo Semgrep: semgrep (via pip)
echo.
pause