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
    PMD_DIR=$(find /opt/tools -maxdepth 1 -type d -name "pmd-bin-*" | head -1) && \
    if [ -z "$PMD_DIR" ]; then echo "❌ Error: No se encontró PMD"; exit 1; fi && \
    echo "✓ PMD directorio: $PMD_DIR" && \
    chmod -R +x "$PMD_DIR/bin" && \
    chmod +x "$PMD_DIR/bin/run.sh" 2>/dev/null || true && \
    ln -sf "$PMD_DIR/bin/pmd" /usr/local/bin/pmd && \
    echo "✓ Symlink creado: /usr/local/bin/pmd -> $PMD_DIR/bin/pmd" && \
    echo "✓ Actualizando PATH con directorio PMD..." && \
    export PATH="$PMD_DIR/bin:/usr/local/bin:${PATH}" && \
    echo "📋 Verificando instalación de PMD..." && \
    "$PMD_DIR/bin/pmd" --version && \
    /usr/local/bin/pmd --version && \
    echo "✅ PMD instalado y verificado"

# Configurar JAVA_HOME y PATH dinámicamente después de instalar PMD
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
# Path será actualizado después de descubrir la ruta real de PMD

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

# Instalar Semgrep como CLI con wrapper script robusto
RUN echo "📦 Instalando Semgrep..." && \
    pip3 install --no-cache-dir --break-system-packages semgrep 2>&1 && \
    echo "✓ Semgrep instalado via pip3" && \
    rm -f /usr/local/bin/semgrep && \
    cat > /usr/local/bin/semgrep << 'SEMGREP_SCRIPT'
#!/bin/sh
# Wrapper script para Semgrep
exec python3 -m semgrep "$@"
SEMGREP_SCRIPT
chmod +x /usr/local/bin/semgrep && \
    echo "✓ Wrapper script /usr/local/bin/semgrep creado y con permisos de ejecución" && \
    echo "📋 Verificando Semgrep..." && \
    python3 -c "import semgrep; print('✓ Semgrep Python module available')" && \
    echo "✅ Semgrep instalado y verificado"

# Asegurar que los symlinks están disponibles en PATH
ENV PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

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
    echo '📋 PMD:' && (pmd --version 2>&1 | head -1 || echo '⚠️ PMD no disponible') && \
    echo '🐛 SpotBugs:' && (spotbugs -version 2>&1 | head -1 || echo '⚠️ SpotBugs no disponible') && \
    echo '🔍 Semgrep:' && (/usr/local/bin/semgrep --version 2>&1 | head -1 || python3 -c \"import semgrep; print('✓ Semgrep (via Python)')\" 2>/dev/null || echo '⚠️ Semgrep no disponible') && \
    echo '✅ Verificación completada' && \
    echo 'Iniciando servidor...' && \
    node dist/main.js"]
