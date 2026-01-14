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

# Instalar PMD
ENV PMD_VERSION=7.0.0
RUN apk add --no-cache unzip && \
    curl -L --retry 3 --retry-delay 2 "https://github.com/pmd/pmd/releases/download/pmd_releases/7.0.0/pmd-bin-7.0.0.zip" -o /tmp/pmd.zip && \
    unzip /tmp/pmd.zip -d /opt && \
    ln -s /opt/pmd-bin-7.0.0/bin/pmd /usr/local/bin/pmd && \
    rm /tmp/pmd.zip && \
    rm -rf /tmp/*

# Instalar SpotBugs
ENV SPOTBUGS_VERSION=4.8.3
RUN curl -L --retry 3 --retry-delay 2 "https://github.com/spotbugs/spotbugs/releases/download/4.8.3/spotbugs-4.8.3.tgz" -o /tmp/spotbugs.tgz && \
    tar -xzf /tmp/spotbugs.tgz -C /opt && \
    ln -s /opt/spotbugs-4.8.3/bin/spotbugs /usr/local/bin/spotbugs && \
    rm /tmp/spotbugs.tgz && \
    rm -rf /tmp/*

# Instalar Semgrep
RUN pip3 install --no-cache-dir semgrep

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando de inicio
CMD ["npm", "run", "start:prod"]
