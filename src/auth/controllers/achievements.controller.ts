import { Controller, Get, Param, UseGuards, Request, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AchievementsService } from '../services/achievements.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisRun } from '../../analysis/entities/analysis-run.entity';

@Controller('achievements')
@UseGuards(AuthGuard('jwt'))
export class AchievementsController {
  constructor(
    private readonly achievementsService: AchievementsService,
    @InjectRepository(AnalysisRun)
    private readonly analysisRepository: Repository<AnalysisRun>,
  ) {}

  @Get()
  async getUserAchievements(@Request() req) {
    // Inicializar logros si no existen
    let achievements = await this.achievementsService.getAchievementsByUserId(
      req.user.id,
    );
    
    if (achievements.length === 0) {
      achievements = await this.achievementsService.initializeAchievementsForUser(req.user);
    }
    
    const points = await this.achievementsService.getTotalAchievementPoints(
      req.user.id,
    );

    return {
      totalPoints: points,
      achievements,
    };
  }

  @Get('unlocked')
  async getUnlockedAchievements(@Request() req) {
    return this.achievementsService.getUnlockedAchievements(req.user.id);
  }

  @Get('locked')
  async getLockedAchievements(@Request() req) {
    return this.achievementsService.getLockedAchievements(req.user.id);
  }

  @Get('check')
  async checkAndUnlock(@Request() req) {
    return this.achievementsService.checkAndUnlockAchievements(req.user.id);
  }

  @Get('progress/:type')
  async getAchievementProgress(@Param('type') type: string, @Request() req) {
    const achievements = await this.achievementsService.getAchievementsByUserId(
      req.user.id,
    );
    return achievements.find((a) => a.type === type);
  }

  @Get('stats')
  async getAchievementStats(@Request() req) {
    let all = await this.achievementsService.getAchievementsByUserId(req.user.id);
    
    // Inicializar logros si no existen
    if (all.length === 0) {
      all = await this.achievementsService.initializeAchievementsForUser(req.user);
    }
    
    const unlocked = all.filter((a) => a.isUnlocked);
    const totalPoints = await this.achievementsService.getTotalAchievementPoints(
      req.user.id,
    );

    return {
      totalAchievements: all.length,
      unlockedCount: unlocked.length,
      completionPercentage: all.length > 0 ? (unlocked.length / all.length) * 100 : 0,
      totalPoints,
      achievements: all,
    };
  }

  @Get('debug')
  async debugAchievements(@Request() req) {
    const userId = req.user.id;
    const analyses = await this.analysisRepository.find({ where: { userId } });
    
    return {
      userId,
      totalAnalyses: analyses.length,
      analyses: analyses.map((a) => ({
        id: a.id,
        student: a.student,
        highSeverityIssues: a.highSeverityIssues,
        totalIssues: a.totalIssues,
        qualityScore: a.qualityScore,
        createdAt: a.createdAt,
      })),
      message: 'Datos de depuración de análisis del usuario',
    };
  }
}
