#!/bin/bash

# Script de instalación de herramientas de análisis de código

echo "🛠️  Instalando herramientas de análisis de código..."

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Instalar Node.js si no existe
if ! command_exists node; then
    echo "❌ Node.js no encontrado. Por favor, instálalo desde https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js encontrado: $(node --version)"
fi

# Instalar npm packages globales
echo "📦 Instalando paquetes npm globales..."
npm install -g @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint

# Instalar Semgrep
if ! command_exists semgrep; then
    echo "📦 Instalando Semgrep..."
    pip3 install semgrep
else
    echo "✅ Semgrep ya está instalado: $(semgrep --version)"
fi

# Instalar Bandit (para Python)
if ! command_exists bandit; then
    echo "📦 Instalando Bandit..."
    pip3 install bandit
else
    echo "✅ Bandit ya está instalado: $(bandit --version)"
fi

# Verificar Java para SpotBugs/PMD
if ! command_exists java; then
    echo "❌ Java no encontrado. Por favor, instala Java 11+ para usar SpotBugs y PMD."
else
    echo "✅ Java encontrado: $(java -version 2>&1 | head -n 1)"
fi

# Verificar Maven
if ! command_exists mvn; then
    echo "⚠️  Maven no encontrado. Instálalo para análisis de proyectos Java con Maven."
else
    echo "✅ Maven encontrado: $(mvn --version | head -n 1)"
fi

echo "🎉 Instalación completada. Herramientas disponibles:"
echo "  - ESLint: $(command_exists eslint && echo "✅" || echo "❌")"
echo "  - Semgrep: $(command_exists semgrep && echo "✅" || echo "❌")"
echo "  - Bandit: $(command_exists bandit && echo "✅" || echo "❌")"
echo "  - Java: $(command_exists java && echo "✅" || echo "❌")"
echo "  - Maven: $(command_exists mvn && echo "✅" || echo "❌")"