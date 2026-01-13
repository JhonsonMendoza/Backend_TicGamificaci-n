```
 ██╗  ██╗███████╗██████╗ ██╗      █████╗ ███╗   ███╗████████╗███████╗
 ██║  ██║██╔════╝██╔══██╗██║     ██╔══██╗████╗ ████║╚══██╔══╝██╔════╝
 ███████║█████╗  ██████╔╝██║     ███████║██╔████╔██║   ██║   █████╗  
 ██╔══██║██╔══╝  ██╔══██╗██║     ██╔══██║██║╚██╔╝██║   ██║   ██╔══╝  
 ██║  ██║███████╗██║  ██║███████╗██║  ██║██║ ╚═╝ ██║   ██║   ███████╗
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   ╚══════╝
                                                                      
        🚀 TESIS BACKEND - HERRAMIENTAS DE ANÁLISIS EN LA NUBE 🚀
```

---

## 📍 ¿DÓNDE EMPEZAR?

### 🎯 PRIMERO: Lee esto (2 minutos)
**[INDEX.md](INDEX.md)** - Índice completo de archivos

### 🚀 SEGUNDO: Prueba localmente (5 minutos)
```bash
docker-compose up -d
./scripts/analyze.sh all
```

### ☁️ TERCERO: Elige proveedor y deploya
- **Fácil (Render):** [RENDER_SIMPLE_SETUP.md](deployment/RENDER_SIMPLE_SETUP.md)
- **Robusto (AWS):** [AWS_ECS_SETUP.md](deployment/AWS_ECS_SETUP.md)
- **Completo:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📚 DOCUMENTACIÓN

### 🎓 Guías Principales
| Guía | Propósito |
|------|-----------|
| **[INDEX.md](INDEX.md)** | 📍 Empieza aquí - índice completo |
| **[CLOUD_DEPLOYMENT_SUMMARY.md](CLOUD_DEPLOYMENT_SUMMARY.md)** | 🎯 Resumen visual |
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | 📖 Guía completa |

### ☁️ Guías por Proveedor
| Proveedor | Guía | Dificultad |
|-----------|------|-----------|
| **Render** | [RENDER_SIMPLE_SETUP.md](deployment/RENDER_SIMPLE_SETUP.md) | ⭐ |
| **AWS** | [AWS_ECS_SETUP.md](deployment/AWS_ECS_SETUP.md) | ⭐⭐⭐ |

### 🛠️ Utilidades
| Utilidad | Uso |
|----------|-----|
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | 💡 Comandos rápidos |
| **[ANALYSIS_TOOLS.md](ANALYSIS_TOOLS.md)** | 🔍 Sobre herramientas |

---

## 🐳 ARCHIVOS TÉCNICOS

### Docker
- **[Dockerfile](Dockerfile)** - Imagen con PMD, SpotBugs, Semgrep
- **[docker-compose.yml](docker-compose.yml)** - Desarrollo local
- **[.dockerignore](.dockerignore)** - Optimización

### Scripts
- **[scripts/analyze.sh](scripts/analyze.sh)** - Linux/Mac
- **[scripts/analyze.ps1](scripts/analyze.ps1)** - Windows

### Configuración
- **[deployment/aws-ecs-task-definition.json](deployment/aws-ecs-task-definition.json)** - AWS ECS

---

## ⚡ COMANDOS ESENCIALES

```bash
# Desarrollo local
docker-compose up -d          # Inicia todo
docker-compose down           # Detiene

# Análisis de código
./scripts/analyze.sh all      # Ejecutar (Linux/Mac)
.\scripts\analyze.ps1 -Type all # Ejecutar (Windows)

# Logs y debugging
docker-compose logs -f backend
docker exec tesis-backend bash

# Más comandos en QUICK_REFERENCE.md
```

---

## 📊 ¿QUÉ INCLUYE?

✅ **PMD** - Análisis estático  
✅ **SpotBugs** - Detección de bugs  
✅ **Semgrep** - Análisis de seguridad  
✅ **PostgreSQL** - Base de datos  
✅ **Docker** - Contenedores  
✅ **Scripts** - Automatizados  
✅ **Guías** - Completas  

---

## 🚀 FLUJO

```
Tu código → Git push → Docker build → Cloud deploy
                              ↓
                    (PMD, SpotBugs, Semgrep incluidos)
```

---

## 📞 AYUDA RÁPIDA

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cómo ejecuto análisis? | `./scripts/analyze.sh all` |
| ¿Dónde están los reportes? | `./reports/` |
| ¿Cómo despiego? | Lee `RENDER_SIMPLE_SETUP.md` |
| ¿Necesito más comandos? | `QUICK_REFERENCE.md` |
| ¿Las herramientas no andan? | Revisar `DEPLOYMENT_GUIDE.md` |

---

## 🎉 PRÓXIMO PASO

**Abre [INDEX.md](INDEX.md)** para ver todo organizado

O si prefieres:
- **Local:** `docker-compose up -d`
- **Render:** [RENDER_SIMPLE_SETUP.md](deployment/RENDER_SIMPLE_SETUP.md)
- **AWS:** [AWS_ECS_SETUP.md](deployment/AWS_ECS_SETUP.md)

---

**Tu proyecto está listo para la nube con análisis automático 🚀**

```
Última actualización: 13 de enero de 2026
Proyecto: Tesis Backend
Tecnología: NestJS, Docker, PostgreSQL
Análisis: PMD, SpotBugs, Semgrep
```
