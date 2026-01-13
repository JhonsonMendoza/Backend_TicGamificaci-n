# Proyecto Maven con Vulnerabilidades para SpotBugs

Este es un proyecto Maven con vulnerabilidades intencionales para pruebas de SpotBugs.

## Estructura del Proyecto

```
MavenVulnerable/
├── pom.xml
├── src/
│   ├── main/java/com/example/
│   │   ├── Application.java
│   │   ├── SecurityVulnerabilities.java
│   │   └── VulnerableClass.java
│   └── test/java/com/example/
│       └── VulnerableClassTest.java
└── README.md
```

## Compilar el Proyecto

```bash
mvn clean compile
```

## Ejecutar SpotBugs

```bash
mvn spotbugs:check
```

## Generar Reporte HTML de SpotBugs

```bash
mvn spotbugs:gui
```

## Ejecutar Tests

```bash
mvn test
```

## Generar Reporte Completo

```bash
mvn clean site
```

El reporte estará disponible en `target/site/`
