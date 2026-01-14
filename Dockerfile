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

# Instalar PMD desde versión estable conocida
RUN echo "Descargando PMD..." && \
    curl -L --retry 3 --connect-timeout 10 \
    "https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip" \
    -o /tmp/pmd.zip 2>&1 && \
    unzip -q /tmp/pmd.zip -d /opt/tools && \
    ln -sf /opt/tools/pmd-7.0.0/bin/pmd /usr/local/bin/pmd && \
    rm /tmp/pmd.zip && \
    echo "✓ PMD instalado exitosamente" || echo "⚠ Error instalando PMD"

# Instalar SpotBugs desde versión estable conocida
RUN echo "Descargando SpotBugs..." && \
    curl -L --retry 3 --connect-timeout 10 \
    "https://github.com/spotbugs/spotbugs/releases/download/4.8.3/spotbugs-4.8.3.zip" \
    -o /tmp/spotbugs.zip 2>&1 && \
    unzip -q /tmp/spotbugs.zip -d /opt/tools && \
    ln -sf /opt/tools/spotbugs-4.8.3/bin/spotbugs /usr/local/bin/spotbugs && \
    rm /tmp/spotbugs.zip && \
    echo "✓ SpotBugs instalado exitosamente" || echo "⚠ Error instalando SpotBugs"

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
