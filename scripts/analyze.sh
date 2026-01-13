#!/bin/bash

# Script para ejecutar análisis de código dentro de Docker
# Uso: ./scripts/analyze.sh [pmd|spotbugs|semgrep|all]

ANALYSIS_TYPE=${1:-all}

echo "🔍 Iniciando análisis de código..."

case $ANALYSIS_TYPE in
  pmd)
    echo "📊 Ejecutando PMD..."
    docker exec tesis-backend pmd -d /app/src -R /app/pmd-ruleset.xml -f csv > reports/pmd-report.csv
    echo "✅ Reporte PMD generado: reports/pmd-report.csv"
    ;;
  spotbugs)
    echo "🐛 Ejecutando SpotBugs..."
    # Primero compilar si es necesario
    docker exec tesis-backend npm run build
    docker exec tesis-backend spotbugs -textui -low -output reports/spotbugs-report.xml dist/
    echo "✅ Reporte SpotBugs generado: reports/spotbugs-report.xml"
    ;;
  semgrep)
    echo "🔐 Ejecutando Semgrep..."
    docker exec tesis-backend semgrep --config=p/owasp-top-ten src/ -o reports/semgrep-report.json
    echo "✅ Reporte Semgrep generado: reports/semgrep-report.json"
    ;;
  all)
    echo "📊 Ejecutando PMD..."
    mkdir -p reports
    docker exec tesis-backend pmd -d /app/src -R /app/pmd-ruleset.xml -f csv > reports/pmd-report.csv
    echo "✅ PMD completado"
    
    echo "🐛 Ejecutando SpotBugs..."
    docker exec tesis-backend npm run build
    docker exec tesis-backend spotbugs -textui -low -output reports/spotbugs-report.xml dist/
    echo "✅ SpotBugs completado"
    
    echo "🔐 Ejecutando Semgrep..."
    docker exec tesis-backend semgrep --config=p/owasp-top-ten src/ -o reports/semgrep-report.json
    echo "✅ Semgrep completado"
    
    echo ""
    echo "📈 Todos los análisis completados:"
    echo "   - reports/pmd-report.csv"
    echo "   - reports/spotbugs-report.xml"
    echo "   - reports/semgrep-report.json"
    ;;
  *)
    echo "❌ Tipo de análisis no reconocido: $ANALYSIS_TYPE"
    echo "Uso: ./scripts/analyze.sh [pmd|spotbugs|semgrep|all]"
    exit 1
    ;;
esac
