import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Configuración de CORS (más permisiva para debugging)
  // Leer configuración de CORS desde variables de entorno (CORS_ORIGIN puede ser '*' o una lista separada por comas)
  const corsOriginRaw = configService.get<string>('CORS_ORIGIN') || process.env.CORS_ORIGIN || '*';
  let corsOrigin: any = true; // por defecto permitir (para compatibilidad en desarrollo)
  if (corsOriginRaw && corsOriginRaw !== '*') {
    corsOrigin = corsOriginRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  // Configuración de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configuración del prefijo global
  app.setGlobalPrefix('api');

  const port = Number(configService.get('PORT') || process.env.PORT || 3001);
  // En entornos en la nube (Render, Docker) debemos ligar a 0.0.0.0 para exponer el puerto
  const host = configService.get('HOST') || process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`🚀 Servidor iniciado en http://${host}:${port}`);
  logger.log(`📊 API disponible en http://${host}:${port}/api`);
  logger.log(`🌐 CORS origen(es): ${corsOriginRaw}`);
}

bootstrap().catch((error) => {
  console.error('Error iniciando la aplicación:', error);
});
