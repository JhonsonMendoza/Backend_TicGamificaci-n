import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from './entities/mission.entity';
import { AnalysisRun } from './entities/analysis-run.entity';

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(AnalysisRun)
    private readonly analysisRepository: Repository<AnalysisRun>,
  ) {}

  async createForAnalysis(analysis: AnalysisRun, missions: Partial<Mission>[]): Promise<Mission[]> {
    const created: Mission[] = [];

    this.logger.log(`📝 Creando ${missions.length} misiones para analysis ${analysis.id}`);

    for (const m of missions) {
      const mission = this.missionRepository.create({
        analysisRunId: analysis.id,
        title: m.title || 'Mejorar seguridad',
        description: m.description || null,
        filePath: m.filePath || null,
        lineStart: m.lineStart || null,
        lineEnd: m.lineEnd || null,
        severity: m.severity || 'medium',
        status: 'pending',
        metadata: m.metadata || null,
      });

      const saved = await this.missionRepository.save(mission);
      this.logger.debug(`   ✅ Misión ${saved.id}: ${saved.title?.substring(0, 50)}... (${saved.severity})`);
      created.push(saved);
    }

    this.logger.log(`✅ Se crearon ${created.length} misiones para analysis ${analysis.id}`);
    return created;
  }

  async findByUserId(userId: number, userEmail?: string, userName?: string): Promise<Mission[]> {
    const { In } = require('typeorm');
    
    // Buscar análisis por userId (análisis nuevos)
    let analyses = await this.analysisRepository.find({ where: { userId } });
    
    // Si no hay análisis con userId, buscar por email en el campo student (análisis antiguos)
    if (analyses.length === 0 && userEmail) {
      analyses = await this.analysisRepository.find({ where: { student: userEmail } });
    }
    
    // Si aún no hay análisis, intentar por nombre del usuario (análisis muy antiguos)
    if (analyses.length === 0 && userName) {
      analyses = await this.analysisRepository.find({ where: { student: userName } });
    }
    
    const ids = analyses.map(a => a.id);
    if (ids.length === 0) return [];
    
    return this.missionRepository.find({ where: { analysisRunId: In(ids) }, order: { createdAt: 'DESC' } });
  }

  async findByAnalysisId(analysisId: number): Promise<Mission[]> {
    this.logger.log(`🔍 Buscando misiones para analysisId=${analysisId}`);
    const missions = await this.missionRepository.find({ where: { analysisRunId: analysisId }, order: { createdAt: 'ASC' } });
    this.logger.log(`   Encontradas: ${missions.length} misiones`);
    if (missions.length > 0) {
      const bySeverity = { high: 0, medium: 0, low: 0 };
      const byTool: Record<string, number> = {};
      missions.forEach(m => {
        bySeverity[m.severity] = (bySeverity[m.severity] || 0) + 1;
        const tool = m.metadata?.tool || 'unknown';
        byTool[tool] = (byTool[tool] || 0) + 1;
      });
      this.logger.log(`   Por severidad: H=${bySeverity.high}, M=${bySeverity.medium}, L=${bySeverity.low}`);
      this.logger.log(`   Por herramienta: ${JSON.stringify(byTool)}`);
    }
    return missions;
  }

  async findById(id: number): Promise<Mission> {
    const m = await this.missionRepository.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Misión no encontrada');
    return m;
  }

  async markFixed(id: number): Promise<Mission> {
    const mission = await this.findById(id);
    mission.status = 'fixed';
    mission.fixedAt = new Date();
    return this.missionRepository.save(mission);
  }

  async markSkipped(id: number): Promise<Mission> {
    const mission = await this.findById(id);
    mission.status = 'skipped';
    return this.missionRepository.save(mission);
  }
}
