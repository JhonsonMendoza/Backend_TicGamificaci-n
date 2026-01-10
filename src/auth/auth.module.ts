import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { Achievement } from './entities/achievement.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AchievementsService } from './services/achievements.service';
import { AchievementsController } from './controllers/achievements.controller';
import { Mission } from '../analysis/entities/mission.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User, Achievement, Mission, AnalysisRun]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AchievementsController],
  providers: [AuthService, LocalStrategy, GoogleStrategy, JwtStrategy, AchievementsService],
  exports: [AuthService, AchievementsService, JwtModule],
})
export class AuthModule {}