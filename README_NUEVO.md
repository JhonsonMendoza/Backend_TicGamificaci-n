# 🔍 Backend de Análisis de Código

Backend desarrollado con NestJS para el análisis automatizado de proyectos de código usando múltiples herramientas de análisis estático.

## 🚀 Características

- **Múltiples herramientas de análisis**: SpotBugs, PMD, Semgrep, ESLint, Bandit
- **Soporte para múltiples lenguajes**: Java, Python, JavaScript/TypeScript, C/C++
- **Análisis automatizado**: Subida de archivos ZIP y análisis automático
- **Base de datos PostgreSQL**: Almacenamiento de resultados y métricas
- **API RESTful**: Endpoints completos para gestión de análisis
- **Métricas de calidad**: Puntuación automática y clasificación de issues

## 📋 Prerrequisitos

- Node.js 18+ y npm
- PostgreSQL 12+
- Python 3.8+ (para Semgrep y Bandit)
- Java 11+ (para SpotBugs y PMD)
- Maven (para proyectos Java)

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar base de datos

Crear base de datos PostgreSQL:
```sql
CREATE DATABASE analysis_db;
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo:
```bash
cp .env.example .env
```

Editar `.env` con tu configuración:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=analysis_db
PORT=3001
```

### 4. Instalar herramientas de análisis

**Windows:**
```bash
.\scripts\install-tools.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/install-tools.sh
./scripts/install-tools.sh
```

## 🏃‍♂️ Ejecución

### Desarrollo
```bash
npm run start:dev
```

### Producción
```bash
npm run build
npm run start:prod
```

El servidor estará disponible en `http://localhost:3001`

## 📡 Endpoints de la API

### Subir proyecto para análisis
```http
POST /api/analysis/upload
Content-Type: multipart/form-data

file: [archivo ZIP del proyecto]
student: [nombre del estudiante]
```

### Obtener análisis específico
```http
GET /api/analysis/:id
```

### Listar todos los análisis
```http
GET /api/analysis
GET /api/analysis?student=nombre_estudiante
```

### Obtener resumen de estudiante
```http
GET /api/analysis/student/:student/summary
```

### Eliminar análisis
```http
DELETE /api/analysis/:id
```

## 🔧 Herramientas Soportadas

| Herramienta | Lenguajes | Descripción |
|-------------|-----------|-------------|
| **SpotBugs** | Java | Detección de bugs y vulnerabilidades |
| **PMD** | Java | Análisis de calidad de código |
| **Semgrep** | Multi-lenguaje | Análisis de seguridad |
| **ESLint** | JavaScript/TypeScript | Linting y mejores prácticas |
| **Bandit** | Python | Análisis de seguridad |

## 📊 Estructura de Respuesta

```json
{
  "success": true,
  "data": {
    "id": 1,
    "student": "juan_perez",
    "status": "completed",
    "qualityScore": 85.5,
    "totalIssues": 12,
    "highSeverityIssues": 2,
    "mediumSeverityIssues": 5,
    "lowSeverityIssues": 5,
    "findings": {
      "summary": {
        "toolsExecuted": 3,
        "successfulTools": 3,
        "failedTools": 0
      },
      "results": {
        "spotbugs": {...},
        "semgrep": {...},
        "eslint": {...}
      }
    },
    "fileStats": {
      "totalFiles": 25,
      "javaFiles": 15,
      "jsFiles": 8,
      "linesOfCode": 1250
    },
    "createdAt": "2024-03-15T10:30:00Z",
    "completedAt": "2024-03-15T10:32:15Z"
  }
}
```

## 🔄 Flujo de Análisis

1. **Subida**: El estudiante sube su proyecto en formato ZIP
2. **Extracción**: El backend descomprime el archivo en `/uploads/`
3. **Detección**: Se identifican los tipos de archivo y lenguajes
4. **Análisis**: Se ejecutan las herramientas correspondientes
5. **Procesamiento**: Se procesan y unifican los resultados
6. **Métricas**: Se calculan puntuaciones y clasificaciones
7. **Almacenamiento**: Los resultados se guardan en PostgreSQL

## 🗂️ Estructura del Proyecto

```
src/
├── analysis/
│   ├── dto/                 # Data Transfer Objects
│   ├── entities/            # Entidades de base de datos
│   ├── services/            # Servicios de lógica de negocio
│   │   ├── file.service.ts  # Gestión de archivos
│   │   └── tool.service.ts  # Ejecución de herramientas
│   ├── analysis.controller.ts
│   ├── analysis.service.ts
│   └── analysis.module.ts
├── app.module.ts            # Módulo principal
└── main.ts                  # Bootstrap de la aplicación
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## 📝 Configuración de Herramientas

### SpotBugs
- Requiere proyecto Maven o Gradle
- Genera reportes XML en `target/spotbugs/`

### PMD
- Funciona con Maven o instalación directa
- Reglas configurables por proyecto

### Semgrep
- Detección automática de lenguajes
- Configuración estándar incluida

### ESLint
- Configuración automática para TS/JS
- Reglas recomendadas aplicadas

### Bandit
- Específico para Python
- Análisis de vulnerabilidades de seguridad

## 🚨 Troubleshooting

### Errores comunes

1. **Error de conexión a BD**
   ```bash
   # Verificar que PostgreSQL esté corriendo
   systemctl status postgresql
   ```

2. **Herramientas no encontradas**
   ```bash
   # Verificar instalación
   semgrep --version
   java -version
   mvn --version
   ```

3. **Permisos de archivo**
   ```bash
   # En Linux/Mac
   chmod +x scripts/install-tools.sh
   ```

### Logs

Los logs se muestran en consola durante desarrollo:
```bash
npm run start:dev
```

## 🔒 Seguridad

- Validación de tipos de archivo
- Límites de tamaño de archivo (100MB)
- Sanitización de nombres de archivo
- Aislamiento de procesos de análisis

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-herramienta`)
3. Commit cambios (`git commit -am 'Añadir nueva herramienta'`)
4. Push a la rama (`git push origin feature/nueva-herramienta`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.