# 🚀 Guía de Despliegue en la Nube

## Descripción General

Este documento explica cómo desplegar el proyecto completo en la nube con todas las herramientas de análisis (PMD, SpotBugs, Semgrep) disponibles.

---

## 📋 Requisitos

- Docker instalado localmente
- Cuenta en un proveedor de nube (AWS, Azure, GCP, Heroku, etc.)
- CLI del proveedor configurado

---

## 🐳 Desarrollo Local con Docker

### 1. Construir la imagen

```bash
cd backend
docker build -t tesis-backend:latest .
```

### 2. Iniciar con docker-compose

```bash
docker-compose up -d
```

Esto inicia:
- **PostgreSQL** en puerto 5432
- **Backend** en puerto 3000 (con hot-reload)
- **Todas las herramientas de análisis** preinstaladas

### 3. Verificar que funciona

```bash
curl http://localhost:3000/health
```

---

## 🔍 Ejecutar Análisis de Código

### Con script (Linux/Mac):

```bash
# Ejecutar todos los análisis
./scripts/analyze.sh all

# O análisis específicos
./scripts/analyze.sh pmd
./scripts/analyze.sh spotbugs
./scripts/analyze.sh semgrep
```

### Con PowerShell (Windows):

```powershell
# Ejecutar todos los análisis
.\scripts\analyze.ps1 -Type all

# O análisis específicos
.\scripts\analyze.ps1 -Type pmd
.\scripts\analyze.ps1 -Type spotbugs
.\scripts\analyze.ps1 -Type semgrep
```

### Dentro del contenedor manualmente:

```bash
# Acceder al contenedor
docker exec -it tesis-backend bash

# Ejecutar herramientas
pmd -d /app/src -R /app/pmd-ruleset.xml -f csv
spotbugs -textui -low dist/
semgrep --config=p/owasp-top-ten src/
```

---

## ☁️ Despliegue en Proveedores Específicos

### AWS (ECS + RDS)

#### 1. Crear repositorio en ECR

```bash
aws ecr create-repository --repository-name tesis-backend

# Autenticarse en ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Taggear la imagen
docker tag tesis-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest

# Pushear la imagen
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest
```

#### 2. Crear RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier tesis-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password "TuContraseñaSegura" \
  --allocated-storage 20
```

#### 3. Crear cluster ECS y servicio

Ver archivo `deployment/aws-ecs-task-definition.json`

### Azure (App Service + Database)

```bash
# Crear grupo de recursos
az group create --name tesis-rg --location eastus

# Crear App Service Plan
az appservice plan create \
  --name tesis-plan \
  --resource-group tesis-rg \
  --sku B2 --is-linux

# Crear Web App
az webapp create \
  --name tesis-backend \
  --resource-group tesis-rg \
  --plan tesis-plan \
  --deployment-container-image-name-user-name <registry-name> \
  --deployment-container-image-name tesis-backend:latest

# Crear PostgreSQL
az postgres server create \
  --resource-group tesis-rg \
  --name tesis-postgres \
  --location eastus \
  --admin-user postgres \
  --admin-password "TuContraseñaSegura" \
  --sku-name B_Gen5_1
```

### Heroku (Deprecated - considerar alternativas)

Heroku discontinuó dynos gratuitos. Usar:
- **Railway.app**
- **Render.com**
- **Fly.io**

#### Ejemplo con Railway:

1. Conectar repositorio en railway.app
2. Railway detectará automáticamente el Dockerfile
3. Configurar variables de entorno
4. Desplegar automáticamente

---

## 🔐 Variables de Entorno en Producción

Crear archivo `.env.production`:

```env
NODE_ENV=production
DB_HOST=<tu-rds-host>
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<contraseña-segura>
DB_NAME=tesis_db
JWT_SECRET=<tu-jwt-secret-aleatorio>
GOOGLE_CLIENT_ID=<de-google-console>
GOOGLE_CLIENT_SECRET=<de-google-console>
GOOGLE_CALLBACK_URL=https://tudominio.com/auth/google/callback
```

**NO pushear `.env.production` a git**

---

## 📊 CI/CD con GitHub Actions

Crear `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: cd backend && docker build -t tesis-backend:latest .
      
      - name: Run analysis
        run: |
          docker-compose -f backend/docker-compose.yml up -d
          sleep 10
          ./backend/scripts/analyze.sh all
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: analysis-reports
          path: backend/reports/

  deploy:
    needs: analyze
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Push to registry
        env:
          REGISTRY: ${{ secrets.REGISTRY_URL }}
          USERNAME: ${{ secrets.REGISTRY_USERNAME }}
          PASSWORD: ${{ secrets.REGISTRY_PASSWORD }}
        run: |
          echo $PASSWORD | docker login -u $USERNAME --password-stdin $REGISTRY
          docker build -t $REGISTRY/tesis-backend:latest backend/
          docker push $REGISTRY/tesis-backend:latest
      
      - name: Deploy to cloud
        # Depende de tu proveedor
        run: echo "Deploying..."
```

---

## 🛠️ Troubleshooting

### Problema: Las herramientas no se encuentran en el contenedor

**Solución:**
```bash
docker exec tesis-backend pmd --version
docker exec tesis-backend spotbugs -version
docker exec tesis-backend semgrep --version
```

### Problema: Base de datos no conecta

**Solución:**
```bash
docker logs tesis-postgres
docker exec tesis-postgres psql -U postgres -c "SELECT 1"
```

### Problema: Tamaño de imagen muy grande

**Solución:** Usar imagen Alpine más compacta (ya está configurado)

---

## 📈 Monitoreo en Producción

### Configurar CloudWatch (AWS)

```bash
# En el contenedor, instalar agent
RUN curl https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
```

### Health checks

El Dockerfile ya incluye:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {...})"
```

---

## 🔄 Actualizar Despliegue

```bash
# Hacer cambios en código
git add .
git commit -m "feat: nueva característica"
git push origin main

# En la nube (manual):
git pull
docker build -t tesis-backend:latest .
docker-compose up -d --no-deps --build backend
```

Con CI/CD configurado, se hace automáticamente.

---

## 📞 Soporte

Para problemas específicos del proveedor de nube, consultar:
- AWS: https://docs.aws.amazon.com/ecs/
- Azure: https://docs.microsoft.com/azure/
- Railway: https://railway.app/docs
- Render: https://render.com/docs
