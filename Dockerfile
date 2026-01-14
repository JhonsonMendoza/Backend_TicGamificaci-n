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

# Etapa 2: Runtime - Imagen final con herramientas de análisis
FROM node:20-alpine

# Invalidar caché de docker para forzar rebuild completo
ARG CACHEBUST=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para herramientas de análisis
RUN apk add --no-cache \
    openjdk11 \
    python3 \
    py3-pip \
    git \
    curl \
    bash \
    ca-certificates

# Instalar herramientas de análisis necesarias
RUN apk add --no-cache unzip tar wget && \
    mkdir -p /opt/tools

# Instalar PMD 7.0.0 con verificación robusta
RUN echo "📥 Descargando PMD 7.0.0..." && \
    mkdir -p /opt/tools && \
    cd /tmp && \
    curl -L --max-time 300 --retry 5 --connect-timeout 30 \
    -o pmd-7.0.0.zip "https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip" && \
    if [ ! -f pmd-7.0.0.zip ]; then \
        echo "❌ Descarga de GitHub fallida, intentando sourceforge..."; \
        curl -L --max-time 300 --retry 5 --connect-timeout 30 \
        "https://downloads.sourceforge.net/project/pmd/pmd/7.0.0/pmd-dist-7.0.0-bin.zip" \
        -o pmd-7.0.0.zip || exit 1; \
    fi && \
    echo "✓ PMD descargado: $(ls -lh pmd-7.0.0.zip)" && \
    unzip -q pmd-7.0.0.zip -d /opt/tools && \
    echo "✓ PMD extraído" && \
    ls -la /opt/tools/ && \
    PMD_DIR="/opt/tools/pmd-bin-7.0.0" && \
    if [ ! -d "$PMD_DIR" ]; then \
        PMD_DIR=$(find /opt/tools -maxdepth 1 -type d -name "pmd-*" | head -1); \
        if [ -z "$PMD_DIR" ]; then echo "❌ Error extrayendo PMD"; exit 1; fi; \
        ln -sf "$PMD_DIR" /opt/tools/pmd-bin-7.0.0; \
    fi && \
    echo "✓ PMD directorio: $PMD_DIR" && \
    chmod +x "$PMD_DIR/bin/pmd" && \
    chmod +x "$PMD_DIR/bin/run.sh" 2>/dev/null || true && \
    ln -sf "$PMD_DIR/bin/pmd" /usr/local/bin/pmd && \
    echo "✓ Symlink creado" && \
    echo "📋 Verificando instalación de PMD..." && \
    "$PMD_DIR/bin/pmd" --version 2>&1 | head -5 && \
    /usr/local/bin/pmd --version 2>&1 | head -5 && \
    which pmd && \
    echo "✅ PMD instalado y funcionando correctamente"

# Instalar SpotBugs desde versión estable (sourceforge como alternativa)
RUN echo "Descargando SpotBugs..." && \
    mkdir -p /tmp/spotbugs_download && \
    (curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    "https://github.com/spotbugs/spotbugs/releases/download/4.8.3/spotbugs-4.8.3.zip" \
    -o /tmp/spotbugs.zip 2>&1 || \
    curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    "https://sourceforge.net/projects/spotbugs/files/spotbugs/4.8.3/spotbugs-4.8.3.zip/download" \
    -o /tmp/spotbugs.zip 2>&1) && \
    unzip -q /tmp/spotbugs.zip -d /opt/tools && \
    SPOTBUGS_DIR=$(ls -d /opt/tools/spotbugs-* 2>/dev/null | head -1) && \
    chmod +x "$SPOTBUGS_DIR/bin/spotbugs" && \
    chmod +x "$SPOTBUGS_DIR/bin/run.sh" 2>/dev/null || true && \
    ln -sf "$SPOTBUGS_DIR/bin/spotbugs" /usr/local/bin/spotbugs && \
    echo "Verificando SpotBugs..." && \
    "$SPOTBUGS_DIR/bin/spotbugs" -version && \
    echo "✓ SpotBugs instalado en $SPOTBUGS_DIR"

# Instalar Maven (necesario para SpotBugs)
RUN echo "Instalando Maven..." && \
    apk add --no-cache maven && \
    mvn --version && \
    echo "✓ Maven instalado exitosamente"

# Instalar Semgrep desde pip
RUN echo "Instalando Semgrep..."; \
    pip3 install --no-cache-dir --break-system-packages semgrep && \
    semgrep --version && \
    echo "✓ Semgrep instalado exitosamente"

# Configurar PATH global para todas las herramientas de análisis
ENV PATH="/opt/tools/pmd-bin-7.0.0/bin:/usr/local/bin:${PATH}"

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (webpack necesita algunas durante runtime)
RUN npm ci

# Copiar la aplicación compilada desde el builder
COPY --from=builder /app/dist ./dist

# Copiar archivos de configuración
COPY pmd-ruleset.xml ./
COPY .env.example ./

# Crear carpeta para uploads
RUN mkdir -p uploads

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Iniciar aplicación con logs de diagnóstico
CMD ["sh", "-c", "echo '🔍 Verificando herramientas instaladas...' && \
    echo '📋 PMD:' && pmd --version && \
    echo '🐛 SpotBugs:' && spotbugs -version && \
    echo '🔍 Semgrep:' && semgrep --version && \
    echo '✅ Todas las herramientas están listas' && \
    echo 'Iniciando servidor...' && \
    node dist/main.js"]
