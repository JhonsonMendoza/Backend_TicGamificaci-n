import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';

export interface RankingUser {
  id: number;
  name: string;
  email: string;
  profilePicture?: string;
  university?: string;
  career?: string;
  totalAnalyses: number;
  averageScore: number;
  totalIssuesFound: number;
  rank: number;
}

export interface GlobalStats {
  totalUsers: number;
  totalAnalyses: number;
  averageQualityScore: number;
  totalIssuesFound: number;
  mostActiveUser: {
    name: string;
    analysesCount: number;
  };
  bestQualityUser: {
    name: string;
    qualityScore: number;
  };
}

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AnalysisRun)
    private analysisRepository: Repository<AnalysisRun>,
  ) {}

  async getGlobalRankings(limit: number = 20): Promise<{
    rankings: RankingUser[];
    globalStats: GlobalStats;
  }> {
    console.log('=== Getting global rankings ===');
    
    // Obtener usuarios sin cargar relaciones de una vez (para evitar problemas con TypeORM)
    const users = await this.userRepository.find({
      where: { isActive: true },
    });
    
    console.log('Total users found:', users.length);
    
    // Inicializar análisis vacíos para cálculos
    users.forEach(u => {
      if (!u.analyses) {
        u.analyses = [];
      }
    });

    // Calcular estadísticas para cada usuario
    const userStats = users
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        university: user.university,
        career: user.career,
        totalAnalyses: user.getTotalAnalyses(),
        averageScore: user.getAverageScore(),
        totalIssuesFound: user.getTotalIssuesFound(),
      }))
      .filter(user => user.totalAnalyses > 0) // Solo usuarios con análisis
      .sort((a, b) => {
        // Ordenar por score promedio (descendente), luego por total de análisis
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          return b.totalAnalyses - a.totalAnalyses;
        }
        return b.averageScore - a.averageScore;
      })
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    // Calcular estadísticas globales
    const globalStats = await this.calculateGlobalStats(users);

    return {
      rankings: userStats,
      globalStats,
    };
  }

  async getUserRanking(userId: number): Promise<{
    userRank: RankingUser | null;
    position: number;
    totalUsers: number;
  }> {
    const allUsers = await this.userRepository.find({
      where: { isActive: true },
    });
    
    // Inicializar analyses vacío para cálculos
    allUsers.forEach(u => {
      if (!u.analyses) {
        u.analyses = [];
      }
    });

    const sortedUsers = allUsers
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        university: user.university,
        career: user.career,
        totalAnalyses: user.getTotalAnalyses(),
        averageScore: user.getAverageScore(),
        totalIssuesFound: user.getTotalIssuesFound(),
      }))
      .filter(user => user.totalAnalyses > 0)
      .sort((a, b) => {
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          return b.totalAnalyses - a.totalAnalyses;
        }
        return b.averageScore - a.averageScore;
      });

    const userIndex = sortedUsers.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return {
        userRank: null,
        position: 0,
        totalUsers: sortedUsers.length,
      };
    }

    return {
      userRank: {
        ...sortedUsers[userIndex],
        rank: userIndex + 1,
      },
      position: userIndex + 1,
      totalUsers: sortedUsers.length,
    };
  }

  async getUniversityRankings(university: string): Promise<RankingUser[]> {
    const users = await this.userRepository.find({
      where: { 
        isActive: true,
        university: university,
      },
    });
    
    // Inicializar analyses vacío para cálculos
    users.forEach(u => {
      if (!u.analyses) {
        u.analyses = [];
      }
    });

    return users
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        university: user.university,
        career: user.career,
        totalAnalyses: user.getTotalAnalyses(),
        averageScore: user.getAverageScore(),
        totalIssuesFound: user.getTotalIssuesFound(),
      }))
      .filter(user => user.totalAnalyses > 0)
      .sort((a, b) => {
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          return b.totalAnalyses - a.totalAnalyses;
        }
        return b.averageScore - a.averageScore;
      })
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }

  async getCareerRankings(career: string): Promise<RankingUser[]> {
    const users = await this.userRepository.find({
      where: { 
        isActive: true,
        career: career,
      },
    });
    
    // Inicializar analyses vacío para cálculos
    users.forEach(u => {
      if (!u.analyses) {
        u.analyses = [];
      }
    });

    return users
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        university: user.university,
        career: user.career,
        totalAnalyses: user.getTotalAnalyses(),
        averageScore: user.getAverageScore(),
        totalIssuesFound: user.getTotalIssuesFound(),
      }))
      .filter(user => user.totalAnalyses > 0)
      .sort((a, b) => {
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          return b.totalAnalyses - a.totalAnalyses;
        }
        return b.averageScore - a.averageScore;
      })
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }

  private async calculateGlobalStats(users: User[]): Promise<GlobalStats> {
    const totalUsers = users.length;
    
    // Obtener todas las estadísticas de análisis
    const allAnalyses = users.flatMap(user => user.analyses || []);
    const totalAnalyses = allAnalyses.length;
    
    // Calcular promedio global de calidad
    const qualityScores = allAnalyses
      .filter(analysis => analysis.qualityScore !== null && analysis.qualityScore !== undefined)
      .map(analysis => typeof analysis.qualityScore === 'string' ? parseFloat(analysis.qualityScore) : analysis.qualityScore);
    
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    // Total de issues encontrados
    const totalIssuesFound = allAnalyses.reduce((total, analysis) => total + (analysis.totalIssues || 0), 0);

    // Usuario más activo
    const userAnalysesCounts = users.map(user => ({
      name: user.name,
      analysesCount: user.getTotalAnalyses(),
    })).filter(user => user.analysesCount > 0);

    const mostActiveUser = userAnalysesCounts.length > 0
      ? userAnalysesCounts.reduce((max, user) => user.analysesCount > max.analysesCount ? user : max)
      : { name: 'N/A', analysesCount: 0 };

    // Usuario con mejor calidad
    const userQualityScores = users.map(user => ({
      name: user.name,
      qualityScore: user.getAverageScore(),
    })).filter(user => user.qualityScore > 0);

    const bestQualityUser = userQualityScores.length > 0
      ? userQualityScores.reduce((max, user) => user.qualityScore > max.qualityScore ? user : max)
      : { name: 'N/A', qualityScore: 0 };

    return {
      totalUsers,
      totalAnalyses,
      averageQualityScore,
      totalIssuesFound,
      mostActiveUser,
      bestQualityUser,
    };
  }
}