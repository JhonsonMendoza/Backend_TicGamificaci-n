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

# Instalar PMD (con fallback suave)
RUN set -e; \
    PMD_VERSION="7.0.0"; \
    echo "Descargando PMD..."; \
    if curl -fL --connect-timeout 30 --max-time 120 \
      "https://github.com/pmd/pmd/releases/download/pmd_releases/${PMD_VERSION}/pmd-bin-${PMD_VERSION}.zip" \
      -o /tmp/pmd.zip 2>/dev/null && [ -s /tmp/pmd.zip ]; then \
        unzip -q /tmp/pmd.zip -d /opt/tools && \
        chmod +x /opt/tools/pmd-${PMD_VERSION}/bin/pmd.sh && \
        ln -sf /opt/tools/pmd-${PMD_VERSION}/bin/pmd.sh /usr/local/bin/pmd && \
        echo "✓ PMD instalado exitosamente"; \
    else \
        echo "⚠ PMD no disponible, usará detección directa"; \
        mkdir -p /opt/tools/pmd-${PMD_VERSION}/bin && \
        echo "#!/bin/sh" > /opt/tools/pmd-${PMD_VERSION}/bin/pmd.sh && \
        chmod +x /opt/tools/pmd-${PMD_VERSION}/bin/pmd.sh && \
        ln -sf /opt/tools/pmd-${PMD_VERSION}/bin/pmd.sh /usr/local/bin/pmd; \
    fi; \
    rm -f /tmp/pmd.zip && rm -rf /tmp/*

# Instalar SpotBugs (con fallback suave)
RUN set -e; \
    SPOTBUGS_VERSION="4.8.3"; \
    echo "Descargando SpotBugs..."; \
    if curl -fL --connect-timeout 30 --max-time 120 \
      "https://github.com/spotbugs/spotbugs/releases/download/${SPOTBUGS_VERSION}/spotbugs-${SPOTBUGS_VERSION}.tgz" \
      -o /tmp/spotbugs.tgz 2>/dev/null && [ -s /tmp/spotbugs.tgz ]; then \
        tar -xzf /tmp/spotbugs.tgz -C /opt/tools && \
        chmod +x /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs && \
        ln -sf /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs /usr/local/bin/spotbugs && \
        echo "✓ SpotBugs instalado exitosamente"; \
    else \
        echo "⚠ SpotBugs no disponible, usará detección directa"; \
        mkdir -p /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin && \
        echo "#!/bin/sh" > /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs && \
        chmod +x /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs && \
        ln -sf /opt/tools/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs /usr/local/bin/spotbugs; \
    fi; \
    rm -f /tmp/spotbugs.tgz && rm -rf /tmp/*

# Instalar Semgrep desde apk y pip (con fallback)
RUN apk add --no-cache py3-semgrep 2>/dev/null || \
    pip3 install --no-cache-dir --break-system-packages semgrep 2>/dev/null || \
    echo "ADVERTENCIA: Semgrep no disponible, continuando"

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
