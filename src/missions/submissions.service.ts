import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionSubmission } from './entities/mission-submission.entity';
import { CustomMission } from './entities/custom-mission.entity';
import { MissionValidatorService } from './mission-validator.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'custom-missions');

  constructor(
    @InjectRepository(MissionSubmission)
    private readonly submissionRepository: Repository<MissionSubmission>,
    @InjectRepository(CustomMission)
    private readonly missionRepository: Repository<CustomMission>,
    private readonly validatorService: MissionValidatorService,
  ) {
    // Asegurar que existe el directorio de uploads
    fs.ensureDirSync(this.uploadsDir);
  }

  async submitMission(
    userId: number,
    missionId: number,
    fileBuffer: Buffer,
  ): Promise<MissionSubmission> {
    this.logger.log(`User ${userId} submitting mission ${missionId}`);

    // Verificar que la misión existe
    const mission = await this.missionRepository.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException(`Misión con ID ${missionId} no encontrada`);
    }

    if (!mission.isActive) {
      throw new BadRequestException('Esta misión no está disponible actualmente');
    }

    // Crear submission inicial
    const submission = this.submissionRepository.create({
      userId,
      customMissionId: missionId,
      status: 'pending',
      submittedAt: new Date(),
    });

    await this.submissionRepository.save(submission);

    try {
      // Extraer archivos
      const extractedPath = path.join(this.uploadsDir, uuidv4());
      await fs.ensureDir(extractedPath);
      
      await this.extractFiles(fileBuffer, extractedPath);
      
      submission.extractedPath = extractedPath;
      await this.submissionRepository.save(submission);

      // Validar automáticamente
      const validationResult = await this.validatorService.validateMission(
        mission,
        extractedPath,
      );

      // Actualizar submission con resultados
      submission.testResults = validationResult.testResults;
      submission.testsPassed = validationResult.testsPassed;
      submission.testsFailed = validationResult.testsFailed;
      submission.pointsAwarded = validationResult.pointsAwarded;
      submission.feedback = validationResult.feedback;
      submission.reviewedAt = new Date();

      if (validationResult.compilationError) {
        submission.status = 'error';
        submission.errorMessage = validationResult.compilationError;
      } else if (validationResult.success) {
        submission.status = 'approved';
      } else {
        submission.status = 'rejected';
        submission.errorMessage = validationResult.error;
      }

      await this.submissionRepository.save(submission);

      return submission;
    } catch (error) {
      this.logger.error(`Error processing submission: ${error.message}`, error.stack);
      
      submission.status = 'error';
      submission.errorMessage = error.message;
      await this.submissionRepository.save(submission);

      throw new BadRequestException('Error procesando la misión: ' + error.message);
    }
  }

  private async extractFiles(fileBuffer: Buffer, extractPath: string): Promise<void> {
    try {
      const zip = new AdmZip(fileBuffer);
      zip.extractAllTo(extractPath, true);
      
      this.logger.debug(`Files extracted to ${extractPath}`);
    } catch (error) {
      throw new BadRequestException('Error extrayendo archivos. Asegúrate de subir un archivo ZIP válido.');
    }
  }

  async findByUser(userId: number): Promise<MissionSubmission[]> {
    return this.submissionRepository.find({
      where: { userId },
      relations: ['customMission'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findByMission(missionId: number): Promise<MissionSubmission[]> {
    return this.submissionRepository.find({
      where: { customMissionId: missionId },
      relations: ['user', 'customMission'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<MissionSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: ['customMission', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission con ID ${id} no encontrada`);
    }

    return submission;
  }

  async getLatestSubmission(userId: number, missionId: number): Promise<MissionSubmission | null> {
    return this.submissionRepository.findOne({
      where: { userId, customMissionId: missionId },
      order: { submittedAt: 'DESC' },
    });
  }

  async getUserStats(userId: number): Promise<any> {
    const submissions = await this.submissionRepository.find({
      where: { userId },
      relations: ['customMission'],
    });

    const totalPoints = submissions
      .filter(s => s.status === 'approved')
      .reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);

    const bySubject = submissions.reduce((acc, s) => {
      const subject = s.customMission.subject;
      if (!acc[subject]) {
        acc[subject] = { approved: 0, total: 0, points: 0 };
      }
      acc[subject].total++;
      if (s.status === 'approved') {
        acc[subject].approved++;
        acc[subject].points += s.pointsAwarded || 0;
      }
      return acc;
    }, {});

    return {
      totalSubmissions: submissions.length,
      totalApproved: submissions.filter(s => s.status === 'approved').length,
      totalPoints,
      bySubject,
    };
  }
}
