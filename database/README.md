# Configuración de Base de Datos en Producción (Render)

## Problema

El error `relation "custom_missions" does not exist` ocurre porque las tablas de custom missions no se crearon automáticamente en producción.

## Soluciones

### Opción 1: Ejecutar Script SQL Directamente (Más Rápido) ⚡

1. **Conectarse a la base de datos de Render:**
   - Ve a tu servicio de PostgreSQL en Render Dashboard
   - Copia la "External Database URL"
   - Usa un cliente como pgAdmin, DBeaver o psql

2. **Ejecutar los scripts en orden:**

   ```bash
   # Primero crear las tablas
   psql "postgres://usuario:password@host/database" -f database/create-custom-missions-tables.sql
   
   # Luego poblar con datos
   psql "postgres://usuario:password@host/database" -f database/seed-custom-missions.sql
   ```

   O desde pgAdmin/DBeaver:
   - Abrir `create-custom-missions-tables.sql`
   - Ejecutar todo el contenido
   - Luego abrir `seed-custom-missions.sql`
   - Ejecutar todo el contenido

### Opción 2: Usar Migraciones de TypeORM (Recomendado) ✅

**Configurar variables de entorno en Render:**

En tu servicio de backend en Render, agrega estas variables:

```env
DB_SYNCHRONIZE=false          # Desactivar sync automático en producción
DB_RUN_MIGRATIONS=true        # Activar migraciones automáticas
DB_LOGGING=false              # Opcional: desactivar logging en producción
```

**Ejecutar migraciones manualmente (si DB_RUN_MIGRATIONS=false):**

```bash
# En desarrollo local
npm run build
npm run migration:run

# Esto ejecutará la migración:
# src/database/migrations/1733284800000-CreateCustomMissionsTables.ts
```

**Luego, poblar con datos:**

Después de que las tablas se creen, aún necesitas ejecutar el seed:

```bash
psql "postgres://..." -f database/seed-custom-missions.sql
```

### Opción 3: Sync Automático (Solo para Testing) ⚠️

**NO RECOMENDADO PARA PRODUCCIÓN**

En variables de entorno de Render:

```env
DB_SYNCHRONIZE=true
```

TypeORM creará las tablas automáticamente al iniciar, pero:
- ⚠️ Puede causar pérdida de datos
- ⚠️ No es idempotente
- ⚠️ Puede crear índices duplicados

## Variables de Entorno Recomendadas para Render

```env
# Base de datos
DB_HOST=<tu-host-de-render>
DB_PORT=5432
DB_USERNAME=<usuario>
DB_PASSWORD=<password>
DB_DATABASE=<nombre-db>
DB_SSL=true

# Configuración de producción
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_RUN_MIGRATIONS=true
DB_LOGGING=false

# JWT
JWT_SECRET=<tu-secret-seguro>
JWT_EXPIRES_IN=7d

# Uploads
UPLOAD_MAX_FILE_SIZE=104857600  # 100MB en bytes
```

## Verificación

Después de aplicar cualquiera de las opciones, verifica que las tablas existan:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('custom_missions', 'mission_submissions');

-- Verificar que hay datos en custom_missions
SELECT COUNT(*) FROM custom_missions;

-- Debería retornar 13 (las misiones seed)
```

## Scripts Disponibles

- `create-custom-missions-tables.sql` - Solo crea las tablas (estructura)
- `seed-custom-missions.sql` - Inserta las 13 misiones iniciales (requiere tablas)
- `setup.sql` - Script completo de setup inicial (otras tablas)

## Troubleshooting

### "relation already exists"
Las tablas ya existen. Solo ejecuta `seed-custom-missions.sql`.

### "duplicate key value violates unique constraint"
Los datos ya existen. Puedes:
- Omitir el seed si ya tienes datos
- O limpiar primero: `DELETE FROM custom_missions WHERE id > 0;`

### "permission denied for schema public"
Tu usuario de base de datos no tiene permisos. Contacta soporte de Render o usa el usuario master.

### Las migraciones no se ejecutan
Verifica que:
- `DB_RUN_MIGRATIONS=true` esté configurado
- El path de migraciones sea correcto
- Los archivos `.ts` se compilen a `.js` en el build
