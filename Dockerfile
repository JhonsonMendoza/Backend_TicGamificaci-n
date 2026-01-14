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

# Instalar PMD desde fuente (GitHub releases)
RUN set -e; \
    echo "Descargando PMD..."; \
    LATEST_PMD=$(curl -s https://api.github.com/repos/pmd/pmd/releases/latest | grep -o '"tag_name": "pmd[^"]*' | cut -d'"' -f4); \
    if [ -n "$LATEST_PMD" ]; then \
        PMD_URL="https://github.com/pmd/pmd/releases/download/$LATEST_PMD/pmd-bin-${LATEST_PMD#pmd-}.zip"; \
        curl -L --fail --silent "$PMD_URL" -o /tmp/pmd.zip && \
        unzip -q /tmp/pmd.zip -d /opt/tools && \
        ln -s /opt/tools/pmd-*/bin/pmd /usr/local/bin/pmd && \
        rm /tmp/pmd.zip && \
        echo "✓ PMD instalado exitosamente"; \
    else \
        echo "⚠ No se pudo obtener PMD"; \
    fi

# Instalar SpotBugs desde fuente (GitHub releases)
RUN set -e; \
    echo "Descargando SpotBugs..."; \
    LATEST_SPOTBUGS=$(curl -s https://api.github.com/repos/spotbugs/spotbugs/releases/latest | grep -o '"tag_name": "[^"]*' | head -1 | cut -d'"' -f4); \
    if [ -n "$LATEST_SPOTBUGS" ]; then \
        SPOTBUGS_URL="https://github.com/spotbugs/spotbugs/releases/download/$LATEST_SPOTBUGS/spotbugs-${LATEST_SPOTBUGS}.zip"; \
        curl -L --fail --silent "$SPOTBUGS_URL" -o /tmp/spotbugs.zip && \
        unzip -q /tmp/spotbugs.zip -d /opt/tools && \
        ln -s /opt/tools/spotbugs-*/bin/spotbugs /usr/local/bin/spotbugs && \
        rm /tmp/spotbugs.zip && \
        echo "✓ SpotBugs instalado exitosamente"; \
    else \
        echo "⚠ No se pudo obtener SpotBugs"; \
    fi

# Instalar Semgrep desde pip
RUN echo "Instalando Semgrep..."; \
    pip3 install --no-cache-dir --break-system-packages semgrep 2>/dev/null && \
    echo "✓ Semgrep instalado exitosamente" || \
    echo "⚠ Error al instalar Semgrep"

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
CMD ["sh", "-c", "echo '=== Verificación de herramientas de análisis ===' && (test -x /usr/local/bin/pmd && pmd --version 2>&1 || echo '⚠ PMD: No disponible (usará detección directa)') && (test -x /usr/local/bin/spotbugs && spotbugs -version 2>&1 | head -1 || echo '⚠ SpotBugs: No disponible (usará detección directa)') && (which semgrep >/dev/null && semgrep --version || echo '⚠ Semgrep: No disponible') && echo '===' && node dist/main.js"]
