# Script para ejecutar análisis de código dentro de Docker
# Uso: .\scripts\analyze.ps1 -Type [pmd|spotbugs|semgrep|all]

param(
    [string]$Type = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Iniciando análisis de código..." -ForegroundColor Cyan

# Crear carpeta de reportes si no existe
if (-not (Test-Path "reports")) {
    New-Item -ItemType Directory -Path "reports" | Out-Null
}

switch ($Type) {
    "pmd" {
        Write-Host "📊 Ejecutando PMD..." -ForegroundColor Yellow
        docker exec tesis-backend pmd -d /app/src -R /app/pmd-ruleset.xml -f csv | Out-File -Path "reports/pmd-report.csv"
        Write-Host "✅ Reporte PMD generado: reports/pmd-report.csv" -ForegroundColor Green
    }
    "spotbugs" {
        Write-Host "🐛 Ejecutando SpotBugs..." -ForegroundColor Yellow
        docker exec tesis-backend npm run build
        docker exec tesis-backend spotbugs -textui -low -output reports/spotbugs-report.xml dist/
        Write-Host "✅ Reporte SpotBugs generado: reports/spotbugs-report.xml" -ForegroundColor Green
    }
    "semgrep" {
        Write-Host "🔐 Ejecutando Semgrep..." -ForegroundColor Yellow
        docker exec tesis-backend semgrep --config=p/owasp-top-ten src/ -o reports/semgrep-report.json
        Write-Host "✅ Reporte Semgrep generado: reports/semgrep-report.json" -ForegroundColor Green
    }
    "all" {
        Write-Host "📊 Ejecutando PMD..." -ForegroundColor Yellow
        docker exec tesis-backend pmd -d /app/src -R /app/pmd-ruleset.xml -f csv | Out-File -Path "reports/pmd-report.csv"
        Write-Host "✅ PMD completado" -ForegroundColor Green
        
        Write-Host "🐛 Ejecutando SpotBugs..." -ForegroundColor Yellow
        docker exec tesis-backend npm run build
        docker exec tesis-backend spotbugs -textui -low -output reports/spotbugs-report.xml dist/
        Write-Host "✅ SpotBugs completado" -ForegroundColor Green
        
        Write-Host "🔐 Ejecutando Semgrep..." -ForegroundColor Yellow
        docker exec tesis-backend semgrep --config=p/owasp-top-ten src/ -o reports/semgrep-report.json
        Write-Host "✅ Semgrep completado" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "📈 Todos los análisis completados:" -ForegroundColor Cyan
        Write-Host "   - reports/pmd-report.csv"
        Write-Host "   - reports/spotbugs-report.xml"
        Write-Host "   - reports/semgrep-report.json"
    }
    default {
        Write-Host "❌ Tipo de análisis no reconocido: $Type" -ForegroundColor Red
        Write-Host "Uso: .\scripts\analyze.ps1 -Type [pmd|spotbugs|semgrep|all]"
        exit 1
    }
}
