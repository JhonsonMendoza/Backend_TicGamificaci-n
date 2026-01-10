import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { CustomMissionsService } from './custom-missions.service';
import { SubmissionsService } from './submissions.service';
import { CustomMission } from './entities/custom-mission.entity';

@Controller('custom-missions')
export class CustomMissionsController {
  constructor(
    private readonly missionsService: CustomMissionsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Get()
  async getAllMissions(
    @Query('subject') subject?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    const missions = await this.missionsService.findAll({
      subject,
      difficulty,
      isActive: true,
    });

    return {
      success: true,
      data: missions,
    };
  }

  @Get('subjects')
  async getSubjects() {
    const subjects = await this.missionsService.getSubjects();
    return {
      success: true,
      data: subjects,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.missionsService.getStatsBySubject();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('my/submissions')
  @UseGuards(AuthGuard('jwt'))
  async getMySubmissions(@Request() req) {
    const userId = req.user.id;
    const submissions = await this.submissionsService.findByUser(userId);

    return {
      success: true,
      data: submissions,
    };
  }

  @Get('my/stats')
  @UseGuards(AuthGuard('jwt'))
  async getMyStats(@Request() req) {
    const userId = req.user.id;
    const stats = await this.submissionsService.getUserStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getMissionById(@Param('id', ParseIntPipe) id: number) {
    const mission = await this.missionsService.findById(id);
    return {
      success: true,
      data: mission,
    };
  }

  @Post(':id/submit')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async submitMission(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo ZIP con el código');
    }

    const userId = req.user.id;
    const submission = await this.submissionsService.submitMission(
      userId,
      id,
      file.buffer,
    );

    return {
      success: true,
      data: submission,
      message: submission.status === 'approved' 
        ? `¡Felicidades! Ganaste ${submission.pointsAwarded} puntos` 
        : 'Tu submission fue evaluada. Revisa el feedback.',
    };
  }

  @Get(':id/submissions')
  @UseGuards(AuthGuard('jwt'))
  async getMissionSubmissions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user.id;
    const latestSubmission = await this.submissionsService.getLatestSubmission(
      userId,
      id,
    );

    return {
      success: true,
      data: latestSubmission,
    };
  }

  // Admin endpoints (opcional, para crear/editar misiones)
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createMission(
    @Body() missionData: Partial<CustomMission>,
    @Request() req,
  ) {
    // TODO: Agregar guard de rol admin
    const mission = await this.missionsService.create(missionData);

    return {
      success: true,
      data: mission,
    };
  }
}
