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
import { Mission } from './analysis/entities/mission.entity';
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
      host: configService.get<string>('DB_HOST') || 'localhost',
      port: Number(configService.get<number>('DB_PORT') || 5432),
      username: configService.get<string>('DB_USERNAME') || 'analysis_user',
      password: configService.get<string>('DB_PASSWORD') || 'admin',
      database: configService.get<string>('DB_DATABASE') || 'analysis_db',
      entities: [AnalysisRun, User, Mission],
      // Preferir control por variables de entorno. Si no existen, usar valores conservadores.
      synchronize: configService.get<boolean>('DB_SYNCHRONIZE') === true || configService.get('DB_SYNCHRONIZE') === 'true' ? true : false,
      logging: configService.get<boolean>('DB_LOGGING') === true || configService.get('DB_LOGGING') === 'true' ? true : false,
      ssl: configService.get<boolean>('DB_SSL') === true || configService.get('DB_SSL') === 'true' ? true : false,
      dropSchema: configService.get<boolean>('DB_DROP_SCHEMA') === true || configService.get('DB_DROP_SCHEMA') === 'true' ? true : false,
      // Configuraciones adicionales para la resiliencia
      retryAttempts: Number(configService.get<number>('DB_RETRY_ATTEMPTS') || 3),
      retryDelay: Number(configService.get<number>('DB_RETRY_DELAY') || 3000),
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
          // Tamaño máximo configurable vía env UPLOAD_MAX_FILE_SIZE (bytes) o MAX_FILE_SIZE (e.g. "100MB").
          fileSize: (function () {
            const raw = process.env.UPLOAD_MAX_FILE_SIZE || process.env.DB_UPLOAD_MAX_FILE_SIZE || process.env.MAX_FILE_SIZE || '';
            if (!raw) return 100 * 1024 * 1024;
            // If numeric string, use as bytes
            if (/^\d+$/.test(raw)) return Number(raw);
            // Support human formats like 100MB, 50KB
            const m = raw.match(/^(\d+)\s*(kb|mb|gb)?$/i);
            if (m) {
              const val = Number(m[1]);
              const unit = (m[2] || '').toLowerCase();
              if (unit === 'kb') return val * 1024;
              if (unit === 'gb') return val * 1024 * 1024 * 1024;
              return val * 1024 * 1024; // default MB
            }
            return 100 * 1024 * 1024;
          })(),
        },
        fileFilter: (req, file, cb) => {
          // Permitir tipos configurables vía env UPLOAD_ALLOWED_MIME (coma-separados) y extensiones UPLOAD_ALLOWED_EXT
          const defaultTypes = [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/octet-stream',
            'text/plain',
            'application/javascript',
            'text/x-python',
            'text/x-java-source'
          ];

          const defaultExt = ['.zip', '.rar', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css'];

          const allowedTypes = (process.env.UPLOAD_ALLOWED_MIME ? process.env.UPLOAD_ALLOWED_MIME.split(',') : defaultTypes).map(s => s.trim()).filter(Boolean);
          const allowedExtensions = (process.env.UPLOAD_ALLOWED_EXT ? process.env.UPLOAD_ALLOWED_EXT.split(',') : defaultExt).map(s => s.trim()).filter(Boolean);

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
export class AppModule { }
