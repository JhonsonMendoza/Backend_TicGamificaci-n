# Proyecto Maven con Vulnerabilidades - SpotBugs

Proyecto Maven configurado con múltiples vulnerabilidades intencionales para pruebas de SpotBugs.

## Estructura

```
MavenVulnerable/
├── pom.xml
├── src/
│   ├── main/java/com/example/
│   │   ├── BuggyProgram.java
│   │   ├── SecurityIssues.java
│   │   └── PerformanceIssues.java
│   └── test/java/com/example/
└── README.md
```

## Compilar

```bash
mvn clean compile
```

## Ejecutar SpotBugs

```bash
mvn spotbugs:spotbugs
```

## Ver reporte HTML

```bash
mvn spotbugs:gui
```

## Generar reporte con Maven Site

```bash
mvn site
```

El reporte estará en `target/site/spotbugs.html`

## Vulnerabilidades incluidas

- NullPointerException
- Resource Leaks
- SQL Injection
- Command Injection
- Hardcoded Passwords
- Weak Random Generators
- String Comparison Issues
- Serialization Problems
- Y más...
