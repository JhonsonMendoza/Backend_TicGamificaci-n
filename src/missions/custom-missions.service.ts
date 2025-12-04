import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomMission } from './entities/custom-mission.entity';

@Injectable()
export class CustomMissionsService {
  constructor(
    @InjectRepository(CustomMission)
    private readonly customMissionRepository: Repository<CustomMission>,
  ) {}

  async findAll(filters?: { subject?: string; difficulty?: string; isActive?: boolean }): Promise<CustomMission[]> {
    const query = this.customMissionRepository.createQueryBuilder('mission');

    if (filters?.subject) {
      query.andWhere('mission.subject = :subject', { subject: filters.subject });
    }

    if (filters?.difficulty) {
      query.andWhere('mission.difficulty = :difficulty', { difficulty: filters.difficulty });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('mission.isActive = :isActive', { isActive: filters.isActive });
    }

    query.orderBy('mission.order', 'ASC').addOrderBy('mission.id', 'ASC');

    return query.getMany();
  }

  async findById(id: number): Promise<CustomMission> {
    const mission = await this.customMissionRepository.findOne({
      where: { id },
    });

    if (!mission) {
      throw new NotFoundException(`Misión con ID ${id} no encontrada`);
    }

    return mission;
  }

  async create(missionData: Partial<CustomMission>): Promise<CustomMission> {
    const mission = this.customMissionRepository.create(missionData);
    return this.customMissionRepository.save(mission);
  }

  async update(id: number, missionData: Partial<CustomMission>): Promise<CustomMission> {
    await this.customMissionRepository.update(id, missionData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const result = await this.customMissionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Misión con ID ${id} no encontrada`);
    }
  }

  async getSubjects(): Promise<string[]> {
    const missions = await this.customMissionRepository.find({
      select: ['subject'],
      where: { isActive: true },
    });
    
    const subjects = [...new Set(missions.map(m => m.subject))];
    return subjects;
  }

  async getStatsBySubject(): Promise<any[]> {
    const result = await this.customMissionRepository
      .createQueryBuilder('mission')
      .select('mission.subject', 'subject')
      .addSelect('COUNT(mission.id)', 'count')
      .where('mission.isActive = :isActive', { isActive: true })
      .groupBy('mission.subject')
      .getRawMany();

    return result;
  }
}
