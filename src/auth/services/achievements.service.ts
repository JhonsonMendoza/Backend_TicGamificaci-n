import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Achievement, AchievementType } from '../entities/achievement.entity';
import { User } from '../entities/user.entity';
import { Mission } from '../../analysis/entities/mission.entity';
import { AnalysisRun } from '../../analysis/entities/analysis-run.entity';

// Definición de logros disponibles
export const ACHIEVEMENTS_DEFINITIONS: Record<
  AchievementType,
  {
    name: string;
    description: string;
    icon: string;
    pointsReward: number;
    condition: string;
    category: 'general' | 'vulnerability' | 'performance' | 'consistency';
  }
> = {
  first_analysis: {
    name: 'Analista Novato',
    description: 'Completar tu primer análisis de código',
    icon: 'badge',
    pointsReward: 50,
    condition: 'Ejecutar y completar 1 análisis',
    category: 'general',
  },
  bug_hunter: {
    name: 'Cazador de Bugs',
    description: 'Detectar y reportar 50 hallazgos acumulados',
    icon: 'target',
    pointsReward: 150,
    condition: 'Acumular 50+ hallazgos en análisis',
    category: 'vulnerability',
  },
  security_expert: {
    name: 'Experto en Seguridad',
    description: 'Corregir 20 hallazgos críticos',
    icon: 'shield',
    pointsReward: 250,
    condition: 'Resolver 20+ hallazgos de severidad alta',
    category: 'vulnerability',
  },
  perfectionist: {
    name: 'Perfeccionista',
    description: 'Lograr 0 hallazgos en un análisis completo',
    icon: 'star',
    pointsReward: 300,
    condition: 'Realizar un análisis sin hallazgos',
    category: 'general',
  },
  persistent: {
    name: 'Persistencia',
    description: 'Completar 10 misiones consecutivas',
    icon: 'flame',
    pointsReward: 200,
    condition: 'Resolver 10+ misiones de forma consecutiva',
    category: 'consistency',
  },
  code_master: {
    name: 'Maestro del Código',
    description: 'Mejorar la calidad de código en 5 iteraciones',
    icon: 'crown',
    pointsReward: 180,
    condition: 'Reducir hallazgos en 5 análisis consecutivos',
    category: 'general',
  },
  vulnerability_slayer: {
    name: 'Exterminador de Vulnerabilidades',
    description: 'Resolver 100 hallazgos totales',
    icon: 'sword',
    pointsReward: 400,
    condition: 'Solucionar 100+ hallazgos acumulados',
    category: 'vulnerability',
  },
  quality_guardian: {
    name: 'Guardián de Calidad',
    description: 'Mantener 0 hallazgos críticos en 3 análisis consecutivos',
    icon: 'shield-check',
    pointsReward: 350,
    condition: 'Tres análisis seguidos sin hallazgos críticos',
    category: 'general',
  },
  speed_analyzer: {
    name: 'Analizador Rápido',
    description: 'Completar 15 análisis de forma eficiente',
    icon: 'zap',
    pointsReward: 160,
    condition: 'Ejecutar 15+ análisis',
    category: 'performance',
  },
  general_mission_master: {
    name: 'Maestro de Misiones Generales',
    description: 'Completar todas las misiones generales de la asignatura',
    icon: 'trophy',
    pointsReward: 500,
    condition: 'Resolver todas las misiones de asignatura',
    category: 'general',
  },
  critical_fixer: {
    name: 'Reparador de Críticos',
    description: 'Resolver 50 hallazgos críticos',
    icon: 'alert-circle',
    pointsReward: 450,
    condition: 'Corregir 50+ hallazgos de severidad alta',
    category: 'vulnerability',
  },
  consistency_champion: {
    name: 'Campeón de Consistencia',
    description: 'Mantener una tasa de corrección del 80%+',
    icon: 'trending-up',
    pointsReward: 280,
    condition: 'Resolver el 80%+ de hallazgos detectados',
    category: 'consistency',
  },
  learning_champion: {
    name: 'Campeón de Aprendizaje',
    description: 'Completar misiones de asignatura con puntuación perfecta',
    icon: 'book-open',
    pointsReward: 380,
    condition: 'Lograr máxima puntuación en misiones generales',
    category: 'performance',
  },
  elite_analyst: {
    name: 'Analista Élite',
    description: 'Alcanzar el nivel máximo de experiencia',
    icon: 'award',
    pointsReward: 600,
    condition: 'Llegar al nivel 10 de experiencia',
    category: 'performance',
  },
  legendary_developer: {
    name: 'Desarrollador Legendario',
    description: 'Desbloquear todos los logros disponibles',
    icon: 'crown-sparkles',
    pointsReward: 1000,
    condition: 'Desbloquear los 14 logros anteriores',
    category: 'general',
  },
  optimization_master: {
    name: 'Maestro de Optimización',
    description: 'Completar 20 análisis mejorando la calidad cada vez',
    icon: 'trending-up',
    pointsReward: 240,
    condition: 'Ejecutar 20+ análisis con mejora continua',
    category: 'performance',
  },
  efficient_developer: {
    name: 'Desarrollador Eficiente',
    description: 'Completar 10 análisis en menos de 30 segundos cada uno',
    icon: 'zap',
    pointsReward: 200,
    condition: 'Ejecutar 10+ análisis de forma rápida',
    category: 'performance',
  },
};

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(AnalysisRun)
    private readonly analysisRepository: Repository<AnalysisRun>,
  ) {}

  // Inicializar logros para un usuario (se llama al crear cuenta)
  async initializeAchievementsForUser(user: User): Promise<Achievement[]> {
    try {
      if (!user || !user.id) {
        this.logger.warn('Usuario sin ID al intentar inicializar logros');
        return [];
      }

      const achievements: Achievement[] = [];

      for (const [type, definition] of Object.entries(ACHIEVEMENTS_DEFINITIONS)) {
        try {
          const achievement = this.achievementRepository.create({
            type: type as AchievementType,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            pointsReward: definition.pointsReward,
            condition: definition.condition,
            category: definition.category,
            isUnlocked: false,
            unlockedAt: null,
            userId: user.id,
            progressCurrent: 0,
            progressTarget: null,
          });

          const saved = await this.achievementRepository.save(achievement);
          achievements.push(saved);
        } catch (error) {
          this.logger.error(`Error al crear logro ${type} para usuario ${user.id}:`, error.message);
          // Continuar con los siguientes logros en lugar de fallar completamente
        }
      }

      this.logger.log(`Se inicializaron ${achievements.length} logros para usuario ${user.id}`);
      return achievements;
    } catch (error) {
      this.logger.error(`Error crítico al inicializar logros para usuario ${user.id}:`, error.message);
      return [];
    }
  }

  // Obtener todos los logros del usuario
  async getAchievementsByUserId(userId: number): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId },
      order: { unlockedAt: 'DESC' },
    });
  }

  // Obtener logros desbloqueados del usuario
  async getUnlockedAchievements(userId: number): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId, isUnlocked: true },
      order: { unlockedAt: 'DESC' },
    });
  }

  // Obtener logros bloqueados (con progreso)
  async getLockedAchievements(userId: number): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId, isUnlocked: false },
      order: { createdAt: 'ASC' },
    });
  }

  // Contar puntos totales de logros desbloqueados
  async getTotalAchievementPoints(userId: number): Promise<number> {
    const unlockedAchievements = await this.getUnlockedAchievements(userId);
    return unlockedAchievements.reduce((sum, ach) => sum + ach.pointsReward, 0);
  }

  // Función principal: Verificar y desbloquear logros basado en progreso del usuario
  async checkAndUnlockAchievements(userId: number): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];

    // Obtener datos del usuario
    const analyses = await this.analysisRepository.find({ where: { userId } });
    const missions = await this.missionRepository.find();
    const userMissions = missions.filter((m) =>
      analyses.some((a) => a.id === m.analysisRunId)
    );

    // Calcular estadísticas
    const stats = {
      totalAnalyses: analyses.length,
      totalDetectedIssues: analyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0),
      totalFixedIssues: userMissions.filter((m) => m.status === 'fixed').length,
      totalCriticalIssues: analyses.reduce(
        (sum, a) => sum + (a.highSeverityIssues || 0),
        0
      ),
      totalCriticalFixed: userMissions.filter(
        (m) => m.status === 'fixed' && m.severity === 'high'
      ).length,
      perfectAnalyses: analyses.filter((a) => a.totalIssues === 0).length,
      consecutiveFixedMissions: this.getConsecutiveFixedMissions(userMissions),
      improvingIterations: this.getImprovingIterations(analyses),
      correctionRate: this.calculateCorrectionRate(analyses, userMissions),
    };

    const achievement = await this.achievementRepository.findOne({
      where: { userId },
    });

    // Verificar cada logro
    const achievementsToCheck: AchievementType[] = [
      'first_analysis',
      'bug_hunter',
      'security_expert',
      'perfectionist',
      'persistent',
      'code_master',
      'vulnerability_slayer',
      'quality_guardian',
      'speed_analyzer',
      'general_mission_master',
      'critical_fixer',
      'consistency_champion',
      'learning_champion',
      'elite_analyst',
      'optimization_master',
      'efficient_developer',
    ];

    for (const type of achievementsToCheck) {
      const shouldUnlock = this.shouldUnlockAchievement(type, stats, userMissions, analyses);

      if (shouldUnlock) {
        const ach = await this.achievementRepository.findOne({
          where: { userId, type, isUnlocked: false },
        });

        if (ach) {
          ach.isUnlocked = true;
          ach.unlockedAt = new Date();
          await this.achievementRepository.save(ach);
          unlockedAchievements.push(ach);
          this.logger.log(`Logro desbloqueado: ${type} para usuario ${userId}`);
        }
      }
    }

    // Verificar si se desbloqueó "legendary_developer"
    const allUnlocked = (await this.getUnlockedAchievements(userId)).length;
    if (allUnlocked === 14) {
      const legendaryAch = await this.achievementRepository.findOne({
        where: { userId, type: 'legendary_developer', isUnlocked: false },
      });
      if (legendaryAch) {
        legendaryAch.isUnlocked = true;
        legendaryAch.unlockedAt = new Date();
        await this.achievementRepository.save(legendaryAch);
        unlockedAchievements.push(legendaryAch);
        this.logger.log(`¡¡Logro Legendario desbloqueado!! ${userId}`);
      }
    }

    return unlockedAchievements;
  }

  // Lógica para determinar si debe desbloquearse un logro
  private shouldUnlockAchievement(
    type: AchievementType,
    stats: any,
    missions: Mission[],
    analyses: AnalysisRun[]
  ): boolean {
    switch (type) {
      case 'first_analysis':
        return stats.totalAnalyses >= 1;

      case 'bug_hunter':
        return stats.totalDetectedIssues >= 50;

      case 'security_expert':
        return stats.totalCriticalFixed >= 20;

      case 'perfectionist':
        return stats.perfectAnalyses >= 1;

      case 'persistent':
        return this.hasConsecutiveFixedMissions(missions, 10);

      case 'code_master':
        return stats.improvingIterations >= 5;

      case 'vulnerability_slayer':
        return stats.totalFixedIssues >= 100;

      case 'quality_guardian':
        return this.hasThreeConsecutivePerfectAnalyses(analyses);

      case 'speed_analyzer':
        return stats.totalAnalyses >= 15;

      case 'general_mission_master':
        return this.hasCompletedAllGeneralMissions(missions);

      case 'critical_fixer':
        return stats.totalCriticalFixed >= 50;

      case 'consistency_champion':
        return stats.correctionRate >= 0.8;

      case 'learning_champion':
        return this.hasMaxScoreInGeneralMissions(missions);

      case 'elite_analyst':
        return stats.totalAnalyses >= 20 && stats.correctionRate >= 0.7;

      case 'optimization_master':
        return stats.totalAnalyses >= 20 && stats.improvingIterations >= 15;

      case 'efficient_developer':
        return this.hasEfficientAnalyses(analyses, 10);

      default:
        return false;
    }
  }

  // Calcular misiones consecutivas completadas
  private getConsecutiveFixedMissions(missions: Mission[]): number {
    let consecutive = 0;
    const fixedMissions = missions.filter((m) => m.status === 'fixed');

    for (const mission of fixedMissions) {
      consecutive++;
    }

    return consecutive;
  }

  // Verificar si tiene N misiones consecutivas completadas (verdaderamente consecutivas)
  private hasConsecutiveFixedMissions(missions: Mission[], count: number): boolean {
    if (missions.length < count) {
      return false;
    }

    // Ordenar misiones por fecha de creación
    const sorted = missions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Buscar 'count' misiones consecutivas con status 'fixed'
    for (let i = 0; i <= sorted.length - count; i++) {
      let allFixed = true;
      for (let j = i; j < i + count; j++) {
        if (sorted[j].status !== 'fixed') {
          allFixed = false;
          break;
        }
      }
      if (allFixed) {
        return true;
      }
    }

    return false;
  }

  // Contar iteraciones donde el número de hallazgos mejoró
  private getImprovingIterations(analyses: AnalysisRun[]): number {
    let count = 0;
    const sorted = analyses.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      if (
        sorted[i].totalIssues < sorted[i - 1].totalIssues
      ) {
        count++;
      }
    }

    return count;
  }

  // Calcular tasa de corrección (issues corregidos / issues detectados)
  private calculateCorrectionRate(
    analyses: AnalysisRun[],
    missions: Mission[]
  ): number {
    const totalDetected = analyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0);
    const totalFixed = missions.filter((m) => m.status === 'fixed').length;

    if (totalDetected === 0) return 0;
    return totalFixed / totalDetected;
  }

  // Verificar si tiene N análisis completados de forma rápida
  private hasEfficientAnalyses(analyses: AnalysisRun[], count: number): boolean {
    if (analyses.length < count) {
      return false;
    }

    // Asumir que los análisis que se completan rápidamente tienen menos hallazgos
    // Por ahora, verificamos si tiene al menos 'count' análisis
    // En una versión mejorada, se podría medir el tiempo real de análisis
    const quickAnalyses = analyses.filter((a) => a.totalIssues < 20 && a.status === 'completed');
    return quickAnalyses.length >= count;
  }

  // Verificar si hay 3 análisis consecutivos sin hallazgos críticos
  private hasThreeConsecutivePerfectAnalyses(analyses: AnalysisRun[]): boolean {
    if (analyses.length < 3) {
      return false;
    }

    // Ordenar análisis por fecha de creación ascendente
    const sorted = analyses.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Buscar 3 análisis consecutivos sin hallazgos críticos (highSeverityIssues === 0)
    for (let i = 0; i <= sorted.length - 3; i++) {
      const hasThreePerfect = 
        (sorted[i].highSeverityIssues === 0 || sorted[i].highSeverityIssues === null) &&
        (sorted[i + 1].highSeverityIssues === 0 || sorted[i + 1].highSeverityIssues === null) &&
        (sorted[i + 2].highSeverityIssues === 0 || sorted[i + 2].highSeverityIssues === null);

      if (hasThreePerfect) {
        return true;
      }
    }

    return false;
  }

  // Verificar si completó todas las misiones generales
  private hasCompletedAllGeneralMissions(missions: Mission[]): boolean {
    // Se verifica comparando el total de misiones vs misiones completadas
    // Una misión es "completada" si está en estado 'fixed' o 'skipped'
    if (missions.length === 0) {
      return false;
    }

    const completedOrSkipped = missions.filter((m) => m.status === 'fixed' || m.status === 'skipped').length;
    return completedOrSkipped === missions.length;
  }

  // Verificar si tiene puntuación máxima en misiones generales
  private hasMaxScoreInGeneralMissions(missions: Mission[]): boolean {
    // Se verifica si todas las misiones están completadas (sin saltar)
    if (missions.length === 0) {
      return false;
    }

    return missions.every((m) => m.status === 'fixed');
  }
}
