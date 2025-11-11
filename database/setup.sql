-- Script para crear la base de datos de análisis
-- PostgreSQL Database Setup

-- Conectar como superusuario postgres:
-- psql -U postgres

-- 1. Crear base de datos (si no existe)
CREATE DATABASE analysis_db
  WITH 
  OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'Spanish_Spain.1252'
  LC_CTYPE = 'Spanish_Spain.1252'
  TABLESPACE = pg_default
  CONNECTION LIMIT = -1;

-- 2. Crear usuario específico para la aplicación
CREATE USER analysis_user WITH PASSWORD 'admin';

-- 3. Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE analysis_db TO analysis_user;

-- 4. Conectarse a la base de datos
\c analysis_db

-- 5. Otorgar permisos en el schema public
GRANT ALL ON SCHEMA public TO analysis_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO analysis_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO analysis_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO analysis_user;

-- Permisos por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO analysis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO analysis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO analysis_user;

-- 6. Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 7. La tabla será creada automáticamente por TypeORM con synchronize: true
-- Pero aquí está el esquema manual por si lo necesitas:

/*
CREATE TABLE IF NOT EXISTS analysis_runs (
    id SERIAL PRIMARY KEY,
    "projectPath" VARCHAR(500) NOT NULL,
    student VARCHAR(255) NOT NULL,
    "originalFileName" VARCHAR(255),
    "fileSize" BIGINT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    findings JSONB,
    "toolResults" JSONB,
    "errorMessage" TEXT,
    "totalIssues" INTEGER DEFAULT 0,
    "highSeverityIssues" INTEGER DEFAULT 0,
    "mediumSeverityIssues" INTEGER DEFAULT 0,
    "lowSeverityIssues" INTEGER DEFAULT 0,
    "qualityScore" DECIMAL(5,2),
    "fileStats" JSONB,
    "analysisLog" TEXT,
    "processingTimeSeconds" INTEGER DEFAULT 0,
    version VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP WITH TIME ZONE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_analysis_runs_student ON analysis_runs(student);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs("createdAt");
CREATE INDEX IF NOT EXISTS idx_analysis_runs_student_status ON analysis_runs(student, status);

-- Trigger para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analysis_runs_updated_at 
    BEFORE UPDATE ON analysis_runs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
*/

-- 8. Insertar datos de prueba (opcional)
INSERT INTO analysis_runs (
    "projectPath", 
    student, 
    "originalFileName", 
    "fileSize",
    status, 
    findings, 
    "totalIssues",
    "highSeverityIssues",
    "mediumSeverityIssues", 
    "lowSeverityIssues",
    "qualityScore",
    "fileStats",
    "completedAt"
) VALUES 
(
    '/uploads/demo_project_1',
    'juan_perez',
    'proyecto_java.zip',
    1024000,
    'completed',
    '{"summary": {"toolsExecuted": 3, "successfulTools": 3, "failedTools": 0}, "results": {"SpotBugs": {"success": true, "findingsCount": 5, "findings": [{"type": "Bug", "priority": "High", "message": "Possible null pointer dereference"}]}}}',
    15,
    3,
    8,
    4,
    78.5,
    '{"totalFiles": 25, "javaFiles": 12, "jsFiles": 8, "pythonFiles": 3, "linesOfCode": 2450}',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    '/uploads/demo_project_2',
    'maria_garcia',
    'proyecto_react.zip',
    2048000,
    'completed',
    '{"summary": {"toolsExecuted": 2, "successfulTools": 2, "failedTools": 0}, "results": {"ESLint": {"success": true, "findingsCount": 8, "findings": [{"type": "Style", "severity": "Medium", "message": "Missing semicolon"}]}}}',
    8,
    0,
    5,
    3,
    92.1,
    '{"totalFiles": 18, "javaFiles": 0, "jsFiles": 15, "pythonFiles": 0, "linesOfCode": 1850}',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    '/uploads/demo_project_3',
    'carlos_lopez',
    'proyecto_python.zip',
    512000,
    'processing',
    NULL,
    0,
    0,
    0,
    0,
    NULL,
    NULL,
    NULL
) ON CONFLICT DO NOTHING;

-- 9. Verificar que todo funcione
SELECT 
    schemaname,
    tablename,
    tableowner 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar permisos del usuario
SELECT 
    r.rolname,
    r.rolsuper,
    r.rolinherit,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolcanlogin
FROM pg_roles r 
WHERE r.rolname = 'analysis_user';

PRINT 'Base de datos configurada correctamente!';