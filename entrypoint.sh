#!/bin/sh

echo ''
echo '============================================'
echo '🔍 VERIFICACIÓN DE HERRAMIENTAS EN RUNTIME'
echo '============================================'
echo ''

echo '📋 PMD:'
if [ -f /usr/bin/pmd ]; then
  /usr/bin/pmd --version 2>&1 | head -1
elif [ -f /opt/tools/pmd/bin/pmd ]; then
  /opt/tools/pmd/bin/pmd --version 2>&1 | head -1
else
  echo '❌ PMD no encontrado'
fi
echo ''

echo '🐛 SpotBugs:'
if [ -f /opt/tools/spotbugs/bin/spotbugs ]; then
  /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -1
elif which spotbugs >/dev/null 2>&1; then
  spotbugs -version 2>&1 | head -1
else
  echo '❌ SpotBugs no encontrado'
fi
echo ''

echo '🔍 Semgrep:'
if which semgrep >/dev/null 2>&1; then
  semgrep --version 2>&1 | head -1
elif [ -f /usr/bin/semgrep ]; then
  /usr/bin/semgrep --version 2>&1 | head -1
else
  echo '❌ Semgrep no encontrado'
fi
echo ''

echo '📦 Maven:'
which mvn >/dev/null 2>&1 && mvn --version 2>&1 | head -1 || echo '❌ Maven no encontrado'
echo ''

echo '============================================'
echo 'Iniciando servidor...'
echo ''

# Usar exec para reemplazar el proceso shell con Node.js
# Esto asegura que Node.js reciba las señales OS correctamente (SIGTERM, SIGINT, etc)
exec node dist/main.js
