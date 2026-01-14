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

# Instalar PMD desde versión estable conocida
RUN echo "📥 Descargando PMD 7.0.0..." && \
    mkdir -p /opt/tools && \
    cd /opt/tools && \
    curl -L --max-time 300 --retry 3 \
    -o pmd.zip "https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip" && \
    if [ ! -f pmd.zip ]; then echo "❌ Descarga fallida"; exit 1; fi && \
    ls -lh pmd.zip && \
    unzip -q pmd.zip && \
    PMD_DIR=$(ls -d pmd-* 2>/dev/null | head -1) && \
    if [ -z "$PMD_DIR" ]; then echo "❌ Error extrayendo PMD"; exit 1; fi && \
    echo "✓ PMD extraído: $PMD_DIR" && \
    chmod +x "$PMD_DIR/bin/pmd" && \
    ln -sf /opt/tools/$PMD_DIR /opt/tools/pmd-bin-7.0.0 && \
    ln -sf /opt/tools/$PMD_DIR/bin/pmd /usr/local/bin/pmd && \
    echo "✓ Enlaces simbólicos creados" && \
    echo "📋 Verificando PMD..." && \
    /opt/tools/$PMD_DIR/bin/pmd --version 2>&1 && \
    /usr/local/bin/pmd --version 2>&1 && \
    ls -la /opt/tools/pmd-bin-7.0.0/ && \
    echo "✅ PMD instalado y verificado exitosamente" && \
    which pmd && echo "PMD PATH: $(which pmd)" && \
    export PATH="/opt/tools/$PMD_DIR/bin:/opt/tools/pmd-bin-7.0.0/bin:$PATH" && \
    echo "export PATH=\"/opt/tools/pmd-bin-7.0.0/bin:$PATH\"" >> /etc/profile

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

# Configurar PATH global para herramientas de análisis
ENV PATH="/opt/tools/pmd-bin-7.0.0/bin:/opt/tools/spotbugs-4.8.3/bin:${PATH}"

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
CMD ["sh", "-c", "pmd --version && semgrep --version && node dist/main.js"]
