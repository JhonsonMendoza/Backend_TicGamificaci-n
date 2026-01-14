# Etapa 1: Builder - Compilar la aplicación
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Etapa 2: Runtime - Imagen final con herramientas de análisis PRE-COMPILADAS
FROM node:20-alpine

WORKDIR /app

# Instalar SOLO dependencias del sistema (sin herramientas pesadas)
RUN apk add --no-cache \
    openjdk11 \
    python3 \
    py3-pip \
    git \
    curl \
    bash \
    ca-certificates

# Crear directorio de herramientas
RUN mkdir -p /opt/tools/bin

# ============ COPIAR HERRAMIENTAS PRECOMPILADAS DEL BUILDER ============
# Copiar PMD desde builder (ya compilado y verificado)
COPY --from=builder /opt/tools/pmd /opt/tools/pmd

# Copiar SpotBugs desde builder  
COPY --from=builder /opt/tools/spotbugs /opt/tools/spotbugs

# ============ INSTALAR SEMGREP EN RUNTIME ============
RUN echo "📦 Instalando Semgrep via pip3..." && \
    pip3 install --no-cache-dir --break-system-packages semgrep && \
    which semgrep && \
    semgrep --version && \
    echo "✅ Semgrep listo"

# ============ INSTALAR MAVEN EN RUNTIME ============
RUN apk add --no-cache maven && \
    mvn --version && \
    echo "✅ Maven listo"

# ============ CREAR SYMLINKS Y PATH ============
RUN ln -sf /opt/tools/pmd/bin/pmd /usr/bin/pmd && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /usr/local/bin/spotbugs && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /opt/tools/bin/spotbugs

# Configurar PATH y JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk \
    PATH="/opt/tools/pmd/bin:/opt/tools/spotbugs/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

# ============ VERIFICAR TODAS LAS HERRAMIENTAS ============
RUN echo "═══════════════════════════════════════════" && \
    echo "✅ VERIFICACIÓN EN IMAGEN FINAL" && \
    echo "═══════════════════════════════════════════" && \
    echo "1️⃣  PMD:" && \
    /opt/tools/pmd/bin/pmd --version 2>&1 | head -1 && \
    echo "   ✓ Path: $(which pmd)" && \
    echo "" && \
    echo "2️⃣  SpotBugs:" && \
    /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -1 && \
    echo "   ✓ Path: $(which spotbugs)" && \
    echo "" && \
    echo "3️⃣  Semgrep:" && \
    semgrep --version && \
    echo "   ✓ Path: $(which semgrep)" && \
    echo "" && \
    echo "4️⃣  Maven:" && \
    mvn --version 2>&1 | head -1 && \
    echo "═══════════════════════════════════════════"

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (webpack necesita algunas durante runtime)
RUN npm ci

# Copiar la aplicación compilada desde el builder
COPY --from=builder /app/dist ./dist

# Copiar archivos de configuración
COPY pmd-ruleset.xml ./
COPY .env.example ./
COPY entrypoint.sh ./

# Crear carpeta para uploads
RUN mkdir -p uploads && chmod +x entrypoint.sh

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Usar exec form (JSON) para mejor manejo de señales OS
ENTRYPOINT ["/app/entrypoint.sh"]
