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

# Verificar que los COPYs funcionaron
RUN echo "✅ COPY desde builder completado" && \
    test -d /opt/tools/pmd && echo "   PMD: ✓" || echo "   PMD: ✗ NO COPIADO" && \
    test -d /opt/tools/spotbugs && echo "   SpotBugs: ✓" || echo "   SpotBugs: ✗ NO COPIADO" && \
    echo "" && \
    echo "🔍 Verificación POST-COPY de PMD:" && \
    ls -la /opt/tools/pmd/bin/pmd 2>/dev/null || echo "❌ No existe /opt/tools/pmd/bin/pmd" && \
    test -x /opt/tools/pmd/bin/pmd && echo "✓ Ejecutable" || echo "❌ NO ejecutable" && \
    file /opt/tools/pmd/bin/pmd 2>/dev/null || echo "❌ No se puede verificar tipo" && \
    echo "" && \
    echo "🔍 Verificación POST-COPY de SpotBugs:" && \
    ls -la /opt/tools/spotbugs/bin/spotbugs 2>/dev/null || echo "❌ No existe /opt/tools/spotbugs/bin/spotbugs" && \
    test -x /opt/tools/spotbugs/bin/spotbugs && echo "✓ Ejecutable" || echo "❌ NO ejecutable" && \
    file /opt/tools/spotbugs/bin/spotbugs 2>/dev/null || echo "❌ No se puede verificar tipo"

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

# ============ CONFIGURAR PATH PRIMERO - ANTES DE SYMLINKS ============
# Poner rutas absolutas PRIMERO en PATH para mayor prioridad
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk \
    PATH="/opt/tools/pmd/bin:/opt/tools/spotbugs/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

# ============ CREAR SYMLINKS COMO BACKUP ============
RUN echo "Creando symlinks..." && \
    mkdir -p /opt/tools/bin && \
    ln -sf /opt/tools/pmd/bin/pmd /usr/bin/pmd 2>&1 || true && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /usr/local/bin/spotbugs 2>&1 || true && \
    ln -sf /opt/tools/spotbugs/bin/spotbugs /opt/tools/bin/spotbugs 2>&1 || true && \
    echo "✅ Symlinks creados"

# ============ VERIFICAR TODAS LAS HERRAMIENTAS ============
RUN echo "═══════════════════════════════════════════" && \
    echo "✅ VERIFICACIÓN EN IMAGEN FINAL" && \
    echo "═══════════════════════════════════════════" && \
    echo "📂 Directorios copiados:" && \
    ls -la /opt/tools/ && \
    echo "" && \
    echo "1️⃣  PMD en PATH:" && \
    echo "   Ruta: /opt/tools/pmd/bin/pmd" && \
    echo "   Existe: $(test -f /opt/tools/pmd/bin/pmd && echo '✓' || echo '❌')" && \
    echo "   Ejecutable: $(test -x /opt/tools/pmd/bin/pmd && echo '✓' || echo '❌')" && \
    echo "   Tipo archivo:" && \
    file /opt/tools/pmd/bin/pmd && \
    echo "   Probando ejecución:" && \
    /opt/tools/pmd/bin/pmd --version 2>&1 | head -3 || echo "❌ ERROR AL EJECUTAR" && \
    echo "" && \
    echo "2️⃣  SpotBugs en PATH:" && \
    echo "   Ruta: /opt/tools/spotbugs/bin/spotbugs" && \
    echo "   Existe: $(test -f /opt/tools/spotbugs/bin/spotbugs && echo '✓' || echo '❌')" && \
    echo "   Ejecutable: $(test -x /opt/tools/spotbugs/bin/spotbugs && echo '✓' || echo '❌')" && \
    echo "   Tipo archivo:" && \
    file /opt/tools/spotbugs/bin/spotbugs && \
    echo "   Probando ejecución:" && \
    /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -3 || echo "❌ ERROR AL EJECUTAR" && \
    echo "" && \
    echo "3️⃣  Semgrep:" && \
    echo "   Ruta: /usr/bin/semgrep" && \
    echo "   Existe: $(test -f /usr/bin/semgrep && echo '✓' || echo '❌')" && \
    echo "   Ejecutable: $(test -x /usr/bin/semgrep && echo '✓' || echo '❌')" && \
    echo "   Tipo archivo:" && \
    file /usr/bin/semgrep && \
    echo "   Probando ejecución:" && \
    /usr/bin/semgrep --version 2>&1 | head -3 || echo "❌ ERROR AL EJECUTAR" && \
    echo "" && \
    echo "4️⃣  Maven:" && \
    which mvn && mvn --version 2>&1 | head -1 && \
    echo "" && \
    echo "5️⃣  PATH actual:" && \
    echo "$PATH" && \
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

# Crear carpeta para uploads
RUN mkdir -p uploads

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Iniciar aplicación con verificación de herramientas
CMD ["sh", "-c", "echo ''; echo '============================================'; echo '🔍 VERIFICACIÓN DE HERRAMIENTAS EN RUNTIME'; echo '============================================'; echo ''; echo '📋 PMD:'; /opt/tools/pmd/bin/pmd --version 2>&1 | head -1 || echo '❌ PMD no disponible'; echo ''; echo '🐛 SpotBugs:'; /opt/tools/spotbugs/bin/spotbugs -version 2>&1 | head -1 || echo '❌ SpotBugs no disponible'; echo ''; echo '🔍 Semgrep:'; semgrep --version 2>&1 | head -1 || echo '❌ Semgrep no disponible'; echo ''; echo '📦 Maven:'; mvn --version 2>&1 | head -1 || echo '❌ Maven no disponible'; echo ''; echo '============================================'; echo 'Iniciando servidor...'; echo ''; exec node dist/main.js"]
