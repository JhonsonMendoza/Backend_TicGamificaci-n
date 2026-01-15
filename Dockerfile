# Etapa 1: Builder - Compilar la aplicación
FROM node:22-alpine AS builder

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

# ============ INSTALAR HERRAMIENTAS EN BUILDER ============
# Instalar dependencias necesarias para herramientas en builder
RUN apk add --no-cache \
    openjdk11 \
    curl \
    unzip \
    bash

# Crear directorio de herramientas
RUN mkdir -p /opt/tools/bin

# ============ INSTALAR PMD EN BUILDER ============
RUN echo "📥 Descargando PMD 7.0.0..." && \
    mkdir -p /opt/tools && \
    cd /tmp && \
    (curl -L --max-time 300 --retry 5 --connect-timeout 30 \
    -o pmd-dist-7.0.0-bin.zip "https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip" 2>&1 || \
    curl -L --max-time 300 --retry 5 --connect-timeout 30 \
    -o pmd-dist-7.0.0-bin.zip "https://downloads.sourceforge.net/project/pmd/pmd/7.0.0/pmd-dist-7.0.0-bin.zip" 2>&1) && \
    echo "✓ PMD descargado, extrayendo..." && \
    unzip -q pmd-dist-7.0.0-bin.zip -d /tmp && \
    echo "📂 Contenido de /tmp después de unzip:" && \
    ls -la /tmp | grep -E "pmd|^d" && \
    mv /tmp/pmd-bin-* /opt/tools/pmd && \
    echo "✅ Directorio movido a /opt/tools/pmd" && \
    ls -la /opt/tools/pmd && \
    chmod -R +x /opt/tools/pmd/bin && \
    /opt/tools/pmd/bin/pmd --version && \
    echo "✅ PMD instalado en /opt/tools/pmd"

# ============ INSTALAR SPOTBUGS EN BUILDER ============
RUN echo "📥 Descargando SpotBugs 4.8.3..." && \
    mkdir -p /opt/tools && \
    cd /tmp && \
    (curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    -o spotbugs-4.8.3.zip "https://github.com/spotbugs/spotbugs/releases/download/4.8.3/spotbugs-4.8.3.zip" 2>&1 || \
    curl -L --retry 5 --connect-timeout 10 --max-time 120 \
    -o spotbugs-4.8.3.zip "https://sourceforge.net/projects/spotbugs/files/spotbugs/4.8.3/spotbugs-4.8.3.zip/download" 2>&1) && \
    echo "✓ SpotBugs descargado, extrayendo..." && \
    unzip -q spotbugs-4.8.3.zip -d /tmp && \
    echo "📂 Contenido de /tmp después de unzip:" && \
    ls -la /tmp | grep -E "spotbugs|^d" && \
    mv /tmp/spotbugs-*/ /opt/tools/spotbugs && \
    echo "✅ Directorio movido a /opt/tools/spotbugs" && \
    ls -la /opt/tools/spotbugs && \
    chmod -R +x /opt/tools/spotbugs/bin && \
    /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -1 && \
    echo "✅ SpotBugs instalado en /opt/tools/spotbugs"

# ============ ETAPA 2: RUNTIME ============
FROM node:22-alpine

WORKDIR /app

# Instalar SOLO dependencias del sistema (sin herramientas pesadas)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    curl \
    bash \
    ca-certificates \
    tzdata \
    openjdk11 \
    maven

# Configurar JAVA_HOME y PATH
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk \
    PATH="/opt/tools/pmd/bin:/opt/tools/spotbugs/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

# Copiar herramientas precompiladas del builder
COPY --from=builder /opt/tools/pmd /opt/tools/pmd
COPY --from=builder /opt/tools/spotbugs /opt/tools/spotbugs

# Instalar Semgrep
RUN pip3 install --no-cache-dir --break-system-packages semgrep

# Crear symlinks
RUN mkdir -p /opt/tools/bin && \
    ln -sf /opt/tools/pmd/bin/pmd /usr/bin/pmd || true && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /usr/local/bin/spotbugs || true

# Verificación de herramientas
RUN echo "✅ Verificando herramientas:" && \
    java -version && \
    /opt/tools/pmd/bin/pmd --version | head -1 && \
    /opt/tools/spotbugs/bin/spotbugs -version | head -1 && \
    semgrep --version | head -1 && \
    mvn --version | head -1

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

# Iniciar aplicación
CMD ["node", "dist/main.js"]
