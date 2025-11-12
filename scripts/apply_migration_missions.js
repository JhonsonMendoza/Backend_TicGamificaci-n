/*
  Script de utilidad para aplicar la migración SQL que crea la tabla `missions`.
  Uso: desde la carpeta `backend` ejecutar:
    node scripts/apply_migration_missions.js
  Requiere: archivo `.env` con variables DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const sqlPath = path.resolve(__dirname, '..', 'database', 'migrations', '20251111_create_missions_table.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('No se encontró el archivo de migración:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'analysis_user',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'analysis_db',
  });

  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('Ejecutando migración: crear tabla missions');
    await client.query(sql);
    console.log('Migración aplicada correctamente.');
  } catch (err) {
    console.error('Error aplicando migración:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
