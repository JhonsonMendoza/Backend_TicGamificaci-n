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

      created.push(await this.missionRepository.save(mission));
    }

    this.logger.log(`Se crearon ${created.length} misiones para analysis ${analysis.id}`);
    return created;
  }

  async findByUserId(userId: number): Promise<Mission[]> {
    // Buscar misiones relacionadas a análisis del usuario
    const analyses = await this.analysisRepository.find({ where: { userId } });
    const ids = analyses.map(a => a.id);
    if (ids.length === 0) return [];
    // Usar In(...) para búsqueda por lista
    const { In } = require('typeorm');
    return this.missionRepository.find({ where: { analysisRunId: In(ids) }, order: { createdAt: 'DESC' } });
  }

  async findByAnalysisId(analysisId: number): Promise<Mission[]> {
    return this.missionRepository.find({ where: { analysisRunId: analysisId }, order: { createdAt: 'ASC' } });
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
