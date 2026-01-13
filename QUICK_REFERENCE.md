# 💡 Comandos Útiles - Referencia Rápida

## 🐳 Docker

### Construir imagen
```bash
docker build -t tesis-backend:latest backend/
```

### Iniciar contenedores
```bash
docker-compose up -d
docker-compose up -d --build  # Con rebuild
```

### Ver estado
```bash
docker-compose ps
docker ps -a
```

### Logs
```bash
docker-compose logs -f backend
docker logs tesis-backend -f
```

### Acceder al contenedor
```bash
docker exec -it tesis-backend bash
docker exec -it tesis-postgres bash
```

### Detener
```bash
docker-compose down
docker-compose down -v  # Con volúmenes
```

### Limpiar todo
```bash
docker system prune -a
```

---

## 🔍 Análisis de Código

### Ejecutar todos los análisis
```bash
# Linux/Mac
./backend/scripts/analyze.sh all

# Windows
.\backend\scripts\analyze.ps1 -Type all
```

### PMD específicamente
```bash
# Desde fuera del contenedor
docker exec tesis-backend pmd -d /app/src -R /app/pmd-ruleset.xml -f csv

# Desde dentro del contenedor
pmd -d src -R pmd-ruleset.xml -f html > reports/pmd-report.html
```

### SpotBugs específicamente
```bash
docker exec tesis-backend npm run build
docker exec tesis-backend spotbugs -textui -low dist/
```

### Semgrep específicamente
```bash
docker exec tesis-backend semgrep --config=p/owasp-top-ten src/ -o reports/semgrep.json
```

---

## 🗄️ Base de Datos

### Conectar a PostgreSQL
```bash
# Desde la máquina local
psql -h localhost -p 5432 -U postgres -d tesis_db

# Desde el contenedor
docker exec -it tesis-postgres psql -U postgres -d tesis_db
```

### Ejecutar SQL
```bash
# Desde archivo
docker exec tesis-postgres psql -U postgres -d tesis_db -f setup.sql

# Comando directo
docker exec tesis-postgres psql -U postgres -d tesis_db -c "SELECT * FROM users;"
```

### Backup
```bash
docker exec tesis-postgres pg_dump -U postgres tesis_db > backup.sql
```

### Restaurar
```bash
docker exec -i tesis-postgres psql -U postgres tesis_db < backup.sql
```

---

## 📦 NPM / Node

### Instalar dependencias
```bash
cd backend
npm install
npm ci  # Para CI/CD (más preciso)
```

### Compilar TypeScript
```bash
npm run build
```

### Tests
```bash
npm test
npm run test:watch
npm run test:cov
```

### Linting
```bash
npm run lint
npm run format
```

---

## 🚀 Despliegue

### AWS ECR
```bash
# Autenticarse
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com

# Taggear
docker tag tesis-backend:latest \
  <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest

# Pushear
docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest

# Ver imágenes
aws ecr describe-images --repository-name tesis-backend
```

### AWS ECS
```bash
# Crear cluster
aws ecs create-cluster --cluster-name tesis-cluster

# Registrar task definition
aws ecs register-task-definition --cli-input-json file://deployment/aws-ecs-task-definition.json

# Crear servicio
aws ecs create-service --cluster tesis-cluster --service-name backend --task-definition tesis-backend

# Ver servicios
aws ecs list-services --cluster tesis-cluster
aws ecs describe-services --cluster tesis-cluster --services backend

# Ver tareas
aws ecs list-tasks --cluster tesis-cluster
aws ecs describe-tasks --cluster tesis-cluster --tasks <TASK_ARN>

# Ver logs
aws logs tail /ecs/tesis-backend -f
```

### Render
```bash
# Instalar CLI
npm install -g render-cli

# Autenticarse
render login

# Ver servicios
render list services

# Ver logs
render logs tesis-backend -f

# Redeploy
render deploy tesis-backend
```

---

## 🔐 Variables de Entorno

### Crear .env local
```bash
cp backend/.env.example backend/.env

# Editar con valores reales
cat > backend/.env << EOF
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=tesis_db
JWT_SECRET=dev-secret-key
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
EOF
```

### Variables en GitHub Actions
```bash
# Guardar secretos
gh secret set DB_PASSWORD -b "password123"
gh secret set JWT_SECRET -b "random-secret-key"
```

---

## 🐛 Debugging

### Ver última línea de error
```bash
docker-compose logs backend | tail -20
```

### Verificar conectividad
```bash
docker exec tesis-backend curl http://localhost:3000/health
docker exec tesis-backend npm list
```

### Entrar en el contenedor
```bash
docker-compose exec backend bash
```

### Revisar archivos
```bash
docker exec tesis-backend ls -la /app/src
docker cp tesis-backend:/app/dist ./dist-local
```

---

## 📊 Monitoreo

### Health check
```bash
curl http://localhost:3000/health
```

### Estadísticas Docker
```bash
docker stats
docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Usar top en contenedor
```bash
docker exec tesis-backend top
```

---

## 🧹 Limpieza

### Eliminar contenedores stopped
```bash
docker container prune
```

### Eliminar imágenes no usadas
```bash
docker image prune -a
```

### Eliminar volúmenes no usados
```bash
docker volume prune
```

### Reset completo
```bash
docker-compose down -v
docker system prune -a --volumes
```

---

## 📝 Git

### Committear cambios
```bash
git add backend/
git commit -m "feat: agregar Docker y herramientas de análisis"
git push origin main
```

### Ver cambios
```bash
git status
git diff backend/Dockerfile
git log --oneline -10
```

### Branches
```bash
git checkout -b feature/cloud-deployment
git push -u origin feature/cloud-deployment
```

---

## 🎯 Workflow Típico

```bash
# 1. Hacer cambios
nano backend/src/app.service.ts

# 2. Probar localmente
docker-compose up -d
docker-compose logs -f backend

# 3. Ejecutar análisis
./backend/scripts/analyze.sh all

# 4. Revisar reportes
cat backend/reports/pmd-report.csv

# 5. Commit y push
git add .
git commit -m "fix: resolver issues de PMD"
git push origin main

# 6. Verificar en nube (Render/AWS redeploya automáticamente)
curl https://tu-dominio.com/health
```

---

**¡Guarda esta guía para referencias rápidas! 📌**
