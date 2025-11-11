import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import * as multer from 'multer';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { RankingModule } from './ranking/ranking.module';
import { AnalysisRun } from './analysis/entities/analysis-run.entity';
import { User } from './auth/entities/user.entity';

@Module({
  imports: [
    // Configuración del entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración de TypeORM para PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'analysis_user'),
        password: configService.get('DB_PASSWORD', 'admin'),
        database: configService.get('DB_DATABASE', 'analysis_db'),
        entities: [AnalysisRun, User],
        synchronize: false, // Cambiar a false para evitar conflictos
        logging: configService.get('DB_LOGGING', false),
        ssl: false,
        dropSchema: false, // No eliminar esquema automáticamente
        // Configuraciones adicionales para evitar errores
        retryAttempts: 3,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),

    // Configuración de archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Configuración de Multer para subida de archivos
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB
        },
        fileFilter: (req, file, cb) => {
          // Permitir solo archivos ZIP y algunos tipos de código
          const allowedTypes = [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/octet-stream',
            'text/plain',
            'application/javascript',
            'text/x-python',
            'text/x-java-source'
          ];
          
          const allowedExtensions = ['.zip', '.rar', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css'];
          const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
          
          if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
          } else {
            cb(new Error('Tipo de archivo no soportado'), false);
          }
        },
      }),
    }),

    // Módulos de la aplicación
    AnalysisModule,
    AuthModule,
    RankingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
