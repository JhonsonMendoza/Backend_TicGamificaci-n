import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Configuración de CORS (más permisiva para debugging)
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
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

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  
  logger.log(`🚀 Servidor iniciado en http://localhost:${port}`);
  logger.log(`📊 API disponible en http://localhost:${port}/api`);
  logger.log(`🗃️ Base de datos: ${configService.get('DB_HOST')}:${configService.get('DB_PORT')}`);
}

bootstrap().catch((error) => {
  console.error('Error iniciando la aplicación:', error);
});
