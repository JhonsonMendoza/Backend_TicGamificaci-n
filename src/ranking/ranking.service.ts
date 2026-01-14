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
    
    // Obtener usuarios activos
    const users = await this.userRepository.find({
      where: { isActive: true },
    });
    
    console.log('Total users found:', users.length);
    
    // Obtener TODOS los análisis (no solo por userId)
    const allAnalyses = await this.analysisRepository.find();
    console.log('Total analyses found:', allAnalyses.length);

    // Para cada usuario, asociar análisis por userId O por student name/email
    const userStats = users
      .map(user => {
        // Obtener análisis del usuario (por userId o por nombre/email como student)
        const userAnalyses = allAnalyses.filter(a => 
          a.userId === user.id || 
          a.student === user.email || 
          a.student === user.name ||
          a.student === `${user.name}`
        );
        
        const totalAnalyses = userAnalyses.length;
        const averageScore = totalAnalyses > 0 
          ? userAnalyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / totalAnalyses
          : 0;
        const totalIssuesFound = userAnalyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0);
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          university: user.university,
          career: user.career,
          totalAnalyses,
          averageScore,
          totalIssuesFound,
        };
      })
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
    const globalStats = await this.calculateGlobalStats(allAnalyses);

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
    // Obtener usuario
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        userRank: null,
        position: 0,
        totalUsers: 0,
      };
    }

    // Obtener TODOS los análisis
    const allAnalyses = await this.analysisRepository.find();

    // Construir ranking similar a getGlobalRankings
    const allUsers = await this.userRepository.find({
      where: { isActive: true },
    });

    const userStats = allUsers
      .map(u => {
        // Obtener análisis del usuario
        const userAnalyses = allAnalyses.filter(a => 
          a.userId === u.id || 
          a.student === u.email || 
          a.student === u.name ||
          a.student === `${u.name}`
        );
        
        const totalAnalyses = userAnalyses.length;
        const averageScore = totalAnalyses > 0 
          ? userAnalyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / totalAnalyses
          : 0;
        const totalIssuesFound = userAnalyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0);
        
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          profilePicture: u.profilePicture,
          university: u.university,
          career: u.career,
          totalAnalyses,
          averageScore,
          totalIssuesFound,
        };
      })
      .filter(u => u.totalAnalyses > 0)
      .sort((a, b) => {
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          return b.totalAnalyses - a.totalAnalyses;
        }
        return b.averageScore - a.averageScore;
      });

    const userIndex = userStats.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return {
        userRank: null,
        position: 0,
        totalUsers: userStats.length,
      };
    }

    return {
      userRank: {
        ...userStats[userIndex],
        rank: userIndex + 1,
      },
      position: userIndex + 1,
      totalUsers: userStats.length,
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

  private async calculateGlobalStats(analyses: AnalysisRun[]): Promise<GlobalStats> {
    const totalAnalyses = analyses.length;
    
    // Contar usuarios únicos que tienen análisis
    const uniqueStudents = new Set(analyses.map(a => a.student).filter(s => s));
    const totalUsers = uniqueStudents.size;
    
    // Calcular promedio global de calidad
    const qualityScores = analyses
      .filter(analysis => analysis.qualityScore !== null && analysis.qualityScore !== undefined)
      .map(analysis => typeof analysis.qualityScore === 'string' ? parseFloat(analysis.qualityScore) : analysis.qualityScore);
    
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    // Total de issues encontrados
    const totalIssuesFound = analyses.reduce((total, analysis) => total + (analysis.totalIssues || 0), 0);

    // Estudiante más activo (más análisis)
    const studentCounts = new Map<string, number>();
    analyses.forEach(analysis => {
      if (analysis.student) {
        studentCounts.set(analysis.student, (studentCounts.get(analysis.student) || 0) + 1);
      }
    });

    let mostActiveUser = { name: 'N/A', analysesCount: 0 };
    if (studentCounts.size > 0) {
      const [name, count] = Array.from(studentCounts.entries())
        .reduce((max, current) => current[1] > max[1] ? current : max);
      mostActiveUser = { name, analysesCount: count };
    }

    // Estudiante con mejor calidad (mejor score promedio)
    const studentQualityMap = new Map<string, { scores: number[]; count: number }>();
    analyses.forEach(analysis => {
      if (analysis.student && analysis.qualityScore) {
        const score = typeof analysis.qualityScore === 'string' ? parseFloat(analysis.qualityScore) : analysis.qualityScore;
        const existing = studentQualityMap.get(analysis.student) || { scores: [], count: 0 };
        existing.scores.push(score);
        existing.count++;
        studentQualityMap.set(analysis.student, existing);
      }
    });

    let bestQualityUser = { name: 'N/A', qualityScore: 0 };
    if (studentQualityMap.size > 0) {
      const entries = Array.from(studentQualityMap.entries()).map(([name, data]) => ({
        name,
        qualityScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      }));
      const best = entries.reduce((max, current) => current.qualityScore > max.qualityScore ? current : max);
      bestQualityUser = best;
    }

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