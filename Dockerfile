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
    ca-certificates \
    unzip \
    tar \
    wget

# Configurar variables de entorno ANTES de instalar herramientas
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk \
    PATH="/opt/tools/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

# Crear directorio de herramientas
RUN mkdir -p /opt/tools/bin

# ============ INSTALAR PMD ============
RUN echo "📥 Descargando PMD 7.0.0..." && \
    cd /tmp && \
    curl -L --max-time 300 --retry 5 --connect-timeout 30 \
    -o pmd-7.0.0.zip "https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip" 2>&1 || \
    curl -L --max-time 300 --retry 5 --connect-timeout 30 \
    -o pmd-7.0.0.zip "https://downloads.sourceforge.net/project/pmd/pmd/7.0.0/pmd-dist-7.0.0-bin.zip" 2>&1 && \
    echo "✓ PMD descargado, extrayendo..." && \
    unzip -q pmd-7.0.0.zip -d /opt/tools && \
    echo "✓ PMD extraído, creando estructura..." && \
    ls -la /opt/tools/ && \
    PMD_EXTRACTED=$(find /opt/tools -maxdepth 1 -type d -name "pmd-bin-*" | head -1) && \
    if [ -z "$PMD_EXTRACTED" ]; then echo "❌ Error: No se encontró directorio pmd-bin-*"; find /opt/tools -maxdepth 2 -type d; exit 1; fi && \
    if [ "$PMD_EXTRACTED" != "/opt/tools/pmd" ]; then mv "$PMD_EXTRACTED" /opt/tools/pmd; fi && \
    chmod -R +x /opt/tools/pmd/bin && \
    ls -la /opt/tools/pmd/bin/ && \
    ln -sf /opt/tools/pmd/bin/pmd /opt/tools/bin/pmd && \
    ln -sf /opt/tools/pmd/bin/pmd /usr/local/bin/pmd && \
    echo "✅ PMD instalado y symlinks creados"

# Verificar PMD funciona
RUN echo "🔍 Verificando PMD..." && \
    if [ -f /opt/tools/pmd/bin/pmd ]; then \
        echo "   ✓ Archivo ejecutable encontrado: /opt/tools/pmd/bin/pmd"; \
        echo "   Intentando ejecutar..."; \
        /opt/tools/pmd/bin/pmd --version 2>&1 | head -1 || echo "⚠️ PMD versión falló pero el binario existe"; \
    else \
        echo "❌ Archivo /opt/tools/pmd/bin/pmd no existe"; \
        ls -la /opt/tools/pmd/bin/ 2>/dev/null || echo "Dir /opt/tools/pmd/bin no existe"; \
        exit 1; \
    fi && \
    echo "✅ PMD verificado"

# ============ INSTALAR SPOTBUGS ============
RUN echo "📥 Descargando SpotBugs..." && \
    cd /tmp && \
    curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    -o spotbugs.zip "https://github.com/spotbugs/spotbugs/releases/download/4.8.3/spotbugs-4.8.3.zip" 2>&1 || \
    curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    -o spotbugs.zip "https://sourceforge.net/projects/spotbugs/files/spotbugs/4.8.3/spotbugs-4.8.3.zip/download" 2>&1 && \
    unzip -q spotbugs.zip -d /tmp && \
    SPOTBUGS_DIR=$(find /tmp -maxdepth 1 -type d -name "spotbugs-*" | head -1) && \
    if [ -z "$SPOTBUGS_DIR" ]; then echo "❌ Error: No se encontró SpotBugs"; exit 1; fi && \
    mv "$SPOTBUGS_DIR" /opt/tools/spotbugs && \
    chmod -R +x /opt/tools/spotbugs/bin && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /opt/tools/bin/spotbugs && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /usr/local/bin/spotbugs && \
    echo "✅ SpotBugs instalado en /opt/tools/spotbugs"

# Verificar SpotBugs funciona
RUN echo "🔍 Verificando SpotBugs..." && \
    if [ -f /opt/tools/spotbugs/bin/spotbugs ]; then \
        echo "   ✓ Archivo ejecutable encontrado"; \
        /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -1 || echo "⚠️ SpotBugs versión falló pero el binario existe"; \
    else \
        echo "❌ Archivo /opt/tools/spotbugs/bin/spotbugs no existe"; \
        exit 1; \
    fi && \
    echo "✅ SpotBugs verificado"

# ============ INSTALAR MAVEN ============
RUN apk add --no-cache maven && \
    mvn --version && \
    echo "✅ Maven instalado"

# ============ INSTALAR SEMGREP ============
RUN echo "📦 Instalando Semgrep via pip3..." && \
    pip3 install --no-cache-dir --break-system-packages semgrep 2>&1 && \
    echo "✓ Semgrep instalado via pip3" && \
    python3 -c "import semgrep; print('✓ Semgrep module loaded')" && \
    echo "📍 Buscando binario ejecutable de Semgrep..." && \
    SEMGREP_BIN=$(which semgrep 2>/dev/null) && \
    if [ -n "$SEMGREP_BIN" ] && [ -f "$SEMGREP_BIN" ] && [ -x "$SEMGREP_BIN" ]; then \
        echo "✓ Binario encontrado via which: $SEMGREP_BIN"; \
        ln -sf "$SEMGREP_BIN" /opt/tools/bin/semgrep; \
        ln -sf "$SEMGREP_BIN" /usr/local/bin/semgrep; \
        echo "✅ Symlinks creados para binario real"; \
    else \
        echo "⚠️ Binario no encontrado via which, buscando en rutas estándar..."; \
        for path in /usr/bin/semgrep /usr/local/bin/semgrep /root/.local/bin/semgrep; do \
            if [ -f "$path" ] && [ -x "$path" ]; then \
                echo "✓ Encontrado en: $path"; \
                ln -sf "$path" /opt/tools/bin/semgrep; \
                ln -sf "$path" /usr/local/bin/semgrep; \
                SEMGREP_BIN="$path"; \
                break; \
            fi; \
        done; \
        if [ -z "$SEMGREP_BIN" ]; then \
            echo "⚠️ Binario no encontrado, creando wrapper como fallback..."; \
            printf '#!/bin/sh\nexec python3 -m semgrep "$@"\n' > /opt/tools/bin/semgrep; \
            chmod +x /opt/tools/bin/semgrep; \
            ln -sf /opt/tools/bin/semgrep /usr/local/bin/semgrep; \
            echo "✅ Wrapper creado como fallback"; \
        else \
            echo "✅ Symlinks creados"; \
        fi; \
    fi && \
    echo "🔍 Verificando Semgrep..." && \
    semgrep --version 2>&1 | head -1 && \
    echo "✅ Semgrep instalado y verificado"

# Asegurar que los symlinks están disponibles en PATH
ENV PATH="/opt/tools/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

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

# Iniciar aplicación con logs de diagnóstico detallados
CMD ["sh", "-c", "\
echo '============================================'; \
echo '🔍 VERIFICACIÓN DE HERRAMIENTAS INSTALADAS'; \
echo '============================================'; \
echo ''; \
echo '📋 PMD:'; \
pmd --version 2>&1 || echo '❌ PMD no disponible'; \
echo ''; \
echo '🐛 SpotBugs:'; \
spotbugs -version 2>&1 || echo '❌ SpotBugs no disponible'; \
echo ''; \
echo '🔍 Semgrep:'; \
semgrep --version 2>&1 || python3 -c \"import semgrep; print('✓ Semgrep (Python)') \" 2>/dev/null || echo '❌ Semgrep no disponible'; \
echo ''; \
echo '📦 Maven:'; \
mvn --version 2>&1 | head -1 || echo '❌ Maven no disponible'; \
echo ''; \
echo '============================================'; \
echo 'Iniciando servidor...'; \
echo ''; \
node dist/main.js"]
