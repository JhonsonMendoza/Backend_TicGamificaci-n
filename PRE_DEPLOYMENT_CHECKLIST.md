# 📋 CHECKLIST PRE-DESPLIEGUE

## ✅ ANTES DE DESPLEGAR EN LA NUBE

### 1. PRUEBAS LOCALES (OBLIGATORIO)
- [ ] `docker-compose up -d` funciona sin errores
- [ ] Backend responde en `http://localhost:3000`
- [ ] `curl http://localhost:3000/health` retorna 200 OK
- [ ] Base de datos conecta correctamente
- [ ] `./scripts/analyze.sh all` ejecuta sin errores
- [ ] Reportes generados: `reports/pmd-report.csv`, `reports/spotbugs-report.xml`, `reports/semgrep-report.json`

### 2. CÓDIGO (OBLIGATORIO)
- [ ] Hacer `git add .` de todos los archivos Docker y guías
- [ ] Verificar que `.gitignore` está actualizado
- [ ] Verificar que no hay secretos en código
- [ ] `npm run lint` sin errores
- [ ] `npm run build` funciona
- [ ] Tests pasan: `npm test`

### 3. VARIABLES DE ENTORNO (CRÍTICO)
- [ ] `.env` local funciona con valores de prueba
- [ ] `.env.example` tiene plantilla correcta
- [ ] DB_PASSWORD no está hardcodeado en Dockerfile
- [ ] JWT_SECRET no está en código
- [ ] GOOGLE_CLIENT_SECRET no está en código
- [ ] Preparar valores seguros para producción:
  - [ ] Nueva contraseña DB (32+ caracteres)
  - [ ] JWT_SECRET aleatorio (usar `openssl rand -base64 32`)
  - [ ] Google OAuth secrets (si usas OAuth)

### 4. DOCKERFILE (VERIFICAR)
- [ ] `docker build -t tesis-backend:latest .` sin errores
- [ ] Imagen construye exitosamente
- [ ] Imagen pesa ~500MB (tamaño razonable)
- [ ] Health check funciona: `docker exec tesis-backend curl http://localhost:3000/health`

### 5. REPOSITORIO GIT (OBLIGATORIO)
- [ ] Repositorio público en GitHub (si usas CI/CD)
- [ ] Rama `main` está actualizada
- [ ] No hay conflictos sin resolver
- [ ] Último commit es limpio y documentado

### 6. ELECCIÓN DE PROVEEDOR (DECIDIR)
- [ ] ¿Cuál proveedor? (Render / AWS / Azure)
- [ ] ¿Acceso a los recursos en la nube?
- [ ] ¿Cuenta de usuario creada?
- [ ] ¿Métodos de pago configurados?

### 7. DOCUMENTACIÓN (LECTURA)
- [ ] Leer guía del proveedor elegido:
  - [ ] RENDER_SIMPLE_SETUP.md si es Render
  - [ ] AWS_ECS_SETUP.md si es AWS
  - [ ] DEPLOYMENT_GUIDE.md para visión general
- [ ] Entender el flujo de despliegue
- [ ] Conocer cómo hacer rollback

### 8. CONFIGURACIÓN EN NUBE (POR PROVEEDOR)

#### SI USAS RENDER
- [ ] Cuenta en https://render.com creada
- [ ] GitHub conectado a Render
- [ ] Nueva PostgreSQL creada en Render
- [ ] Variables de entorno configuradas en Render Dashboard
- [ ] Entender qué es "Internal Database URL"

#### SI USAS AWS
- [ ] Cuenta AWS con acceso
- [ ] AWS CLI instalado y configurado
- [ ] ECR repository creado (`aws ecr create-repository`)
- [ ] RDS PostgreSQL creado
- [ ] VPC y security groups configurados
- [ ] IAM roles y permisos adecuados
- [ ] Conocer tu AWS Account ID y región

#### SI USAS AZURE
- [ ] Cuenta Azure creada
- [ ] Azure CLI instalado
- [ ] Resource Group creado
- [ ] Container Registry configurado
- [ ] PostgreSQL Database creado
- [ ] App Service Plan creado

---

## 🚀 DÍA DEL DESPLIEGUE

### PASO 1: ÚLTIMO COMMIT
```bash
git add .
git commit -m "chore: listo para despliegue a nube con herramientas de análisis"
git push origin main
```

### PASO 2: CONSTRUIR IMAGEN
```bash
docker build -t tesis-backend:latest .
```

### PASO 3: VERIFICAR IMAGEN
```bash
docker run -it tesis-backend:latest pmd --version
docker run -it tesis-backend:latest spotbugs -version
docker run -it tesis-backend:latest semgrep --version
```

### PASO 4: SUBIR A REGISTRY
**Si es Render:** Render detecta automáticamente el Dockerfile

**Si es AWS:**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com

docker tag tesis-backend:latest \
  <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest

docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest
```

### PASO 5: DEPLOYING EN LA NUBE
Seguir instrucciones específicas del proveedor

### PASO 6: VERIFICAR QUE FUNCIONA
```bash
# Esperar 2-3 minutos a que inicie
curl https://tu-app.com/health

# Debería retornar:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### PASO 7: VERIFICAR ANÁLISIS
```bash
# Acceder al servidor y ejecutar análisis
curl https://tu-app.com/analysis/run

# O si tienes SSH:
ssh user@server.com
docker exec tesis-backend ./scripts/analyze.sh all
```

---

## ⚠️ PROBLEMAS COMUNES

| Problema | Solución |
|----------|----------|
| Docker build falla | Ver error, revisar rutas en Dockerfile |
| Imagen muy grande | Verificar .dockerignore, usar Alpine |
| Conexión DB falla | Verificar DB_HOST, puerto, credenciales |
| Health check falla | `docker logs tesis-backend` para ver error |
| Herramientas no se encuentran | `docker exec tesis-backend pmd --version` para verificar |
| Deploy no triggerea | Verificar que `.git` está sincronizado |

Ver QUICK_REFERENCE.md para comandos de debugging

---

## 📞 DESPUÉS DEL DESPLIEGUE

- [ ] Monitorear logs por 1 hora
- [ ] Hacer pruebas funcionales básicas
- [ ] Verificar que análisis se ejecutan
- [ ] Documentar cualquier issue encontrado
- [ ] Hacer rollback si hay problemas graves
- [ ] Celebrar 🎉

---

## 📊 MÉTRICAS A REVISAR

Después de desplegar, revisar:

```
✅ Uptime
✅ Response time (< 500ms ideal)
✅ Database connections
✅ Memory usage (< 500MB ideal)
✅ Error rate (0% ideal)
✅ Analysis execution time (PMD, SpotBugs, Semgrep)
```

---

## 🔄 FUTURAS ACTUALIZACIONES

Una vez en producción:

- [ ] Configurar backups automáticos
- [ ] Configurar monitoring (CloudWatch, DataDog, etc)
- [ ] Configurar alertas
- [ ] Configurar CI/CD completo
- [ ] Escalar si es necesario
- [ ] Documentar runbooks de operación

---

## 📖 REFERENCIAS RÁPIDAS

- Guía elegida: [RENDER_SIMPLE_SETUP.md](deployment/RENDER_SIMPLE_SETUP.md) o [AWS_ECS_SETUP.md](deployment/AWS_ECS_SETUP.md)
- Comandos útiles: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Troubleshooting: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)
- Arquitectura: [ARCHITECTURE.md](ARCHITECTURE.md)

---

**¡Cuando todo esté verde ✅, estás listo para desplegar!**
