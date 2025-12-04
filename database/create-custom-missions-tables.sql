-- Script para crear las tablas de custom missions
-- Ejecutar en Render ANTES de iniciar el backend

-- Tabla de misiones personalizadas
CREATE TABLE IF NOT EXISTS custom_missions (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR NOT NULL,
  difficulty VARCHAR NOT NULL,
  points_min INTEGER,
  points_max INTEGER,
  base_points INTEGER DEFAULT 0,
  points_per_test INTEGER DEFAULT 0,
  required_classes TEXT NOT NULL,
  required_methods TEXT,
  tests JSON,
  criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  "order" INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de submissions de misiones
CREATE TABLE IF NOT EXISTS mission_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  custom_mission_id INTEGER NOT NULL,
  extracted_path VARCHAR,
  status VARCHAR NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  "testResults" JSON,
  feedback TEXT,
  "errorMessage" TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_custom_mission 
    FOREIGN KEY (custom_mission_id) 
    REFERENCES custom_missions(id) 
    ON DELETE CASCADE
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_custom_missions_subject ON custom_missions(subject);
CREATE INDEX IF NOT EXISTS idx_custom_missions_difficulty ON custom_missions(difficulty);
CREATE INDEX IF NOT EXISTS idx_custom_missions_active ON custom_missions(is_active);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_user ON mission_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_mission ON mission_submissions(custom_mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_status ON mission_submissions(status);
