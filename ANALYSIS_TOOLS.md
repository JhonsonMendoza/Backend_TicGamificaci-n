# 🛠️ Herramientas de Análisis de Código

Este proyecto incluye tres herramientas de análisis estática de código:

## 📊 PMD
**Static Code Analysis Tool**
- Detecta: bugs, malas prácticas, complejidad
- Configuración: `pmd-ruleset.xml`

## 🐛 SpotBugs
**Bug Detection for Java/Bytecode**
- Detecta: bugs potenciales, vulnerabilidades
- Requiere: código compilado a bytecode

## 🔐 Semgrep
**Static Analysis Engine**
- Detecta: vulnerabilidades OWASP, secretos, patrones inseguros
- Lenguajes: TypeScript, Python, Java, Go, etc.

---

## 🚀 Uso Local

### Con Docker (Recomendado)

```bash
# Iniciar contenedores
docker-compose up -d

# Ejecutar análisis
./scripts/analyze.sh all          # Linux/Mac
.\scripts\analyze.ps1 -Type all   # Windows
```

### Sin Docker

```bash
# Instalar herramientas localmente
./install-analysis-tools.bat  # Windows
./install-tools.sh             # Linux/Mac

# Ejecutar análisis
pmd -d src -R pmd-ruleset.xml -f csv
semgrep --config=p/owasp-top-ten src/
```

---

## ☁️ En la Nube

Las herramientas están **preinstaladas** en el Dockerfile:

```dockerfile
# PMD
RUN curl -L https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-bin-${PMD_VERSION}.zip

# SpotBugs
RUN curl -L https://github.com/spotbugs/spotbugs/releases/download/${SPOTBUGS_VERSION}/spotbugs-${SPOTBUGS_VERSION}.tgz

# Semgrep
RUN pip3 install semgrep
```

Ejecutar en servidor:
```bash
docker exec tesis-backend ./scripts/analyze.sh all
```

---

## 📋 Reportes Generados

- `reports/pmd-report.csv` - PMD findings
- `reports/spotbugs-report.xml` - SpotBugs findings
- `reports/semgrep-report.json` - Semgrep findings

---

## 🔗 Documentación Oficial

- [PMD](https://pmd.github.io/)
- [SpotBugs](https://spotbugs.readthedocs.io/)
- [Semgrep](https://semgrep.dev/docs/)
