# Desplegar en Render.com (Opción Sencilla y Gratuita)

Render.com es una alternativa moderna y fácil a Heroku.

## 1. Crear cuenta

- Ir a https://render.com
- Sign up with GitHub / Google
- Conectar tu repositorio

## 2. Crear base de datos PostgreSQL

1. En dashboard de Render → New + → PostgreSQL
2. Configurar:
   - **Name:** `tesis-postgres`
   - **Database Name:** `tesis_db`
   - **User:** `postgres`
   - **Plan:** Free (0.25 GB RAM, 1 GB storage)
3. Copiar el **Internal Database URL**

## 3. Crear Web Service

1. En dashboard → New + → Web Service
2. Conectar tu repositorio GitHub
3. Configurar:

   **Build & Deploy:**
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `npm run start:prod` (desde carpeta backend)
   - Root Directory: `backend`

   **Environment:**
   - NODE_ENV: `production`
   - DB_HOST: (del Internal URL de PostgreSQL)
   - DB_PORT: `5432`
   - DB_NAME: `tesis_db`
   - DB_USERNAME: `postgres`
   - DB_PASSWORD: (de la base de datos)
   - JWT_SECRET: (genera uno aleatorio)
   - GOOGLE_CLIENT_ID: (tu Google OAuth ID)
   - GOOGLE_CLIENT_SECRET: (tu Google OAuth secret)

   **Advanced:**
   - Docker: Enable
   - Dockerfile path: `backend/Dockerfile`

4. Plan: **Free o Standard** ($7/mes)

5. Click "Create Web Service"

## 4. Configurar variables de entorno seguras

En la página del servicio:
1. Environment → Add Secret File
2. Crear `.env.production` con las variables sensibles
3. Render las injeccta automáticamente

## 5. Verificar despliegue

```bash
# Ver logs en tiempo real
# Dashboard → Tesis Backend → Logs

# Probar endpoint
curl https://tesis-backend.onrender.com/health
```

## 6. Actualizar despliegue

Cada push a `main` redeploya automáticamente:
```bash
git add .
git commit -m "fix: actualizar herramientas"
git push origin main

# Render redeploya automáticamente
# Ver progreso en Dashboard → Deployments
```

## 7. Backup de base de datos

En Render:
1. PostgreSQL → Backups
2. Descargar backup automático diario

## Ventajas

✅ Gratuito para comenzar  
✅ No requiere Docker localmente  
✅ Deploy automático con Git  
✅ HTTPS automático  
✅ Escalado fácil  
✅ Soporte técnico bueno  

## Limitaciones del Free tier

- 0.5 GB RAM
- 1 GB storage
- Durará 15 min inactivo
- Sin replicas

## Upgrade a pago

Una vez estable, cambiar a:
- **Starter** ($7/mes): 0.5 GB RAM, sin inactividad
- **Standard** ($12/mes): 1 GB RAM, escalado automático

---

## Script para automatizar con Render CLI

```bash
# Instalar Render CLI
npm install -g render-cli

# Loguearse
render login

# Ver servicios
render list services

# Ver logs
render logs tesis-backend -f

# Redeployas
render deploy tesis-backend
```

## Variables de entorno para desarrollo

Crear `backend/.env.development`:
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=tesis_db
JWT_SECRET=dev-secret-key
```

## Ejemplo completo de deploy

```bash
# 1. Hacer cambios
echo "Nueva característica" >> src/app.service.ts

# 2. Commit y push
git add .
git commit -m "feat: nueva característica con herramientas de análisis"
git push origin main

# 3. Render redeploya automáticamente
# Puedes ver el progreso en: https://dashboard.render.com

# 4. Después de 2-3 minutos estará live
curl https://tesis-backend.onrender.com/health
```

---

**¡Listo! Tu proyecto está en la nube con PMD, SpotBugs y Semgrep disponibles.**
