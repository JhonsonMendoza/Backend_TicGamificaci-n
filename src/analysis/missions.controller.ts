import { Controller, Get, Post, Param, UseGuards, Request, BadRequestException, UploadedFile, UseInterceptors, UnauthorizedException, HttpException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { MissionsService } from './missions.service';
import { AnalysisService } from './analysis.service';

@Controller('missions')
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly analysisService: AnalysisService,
  ) {}

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async myMissions(@Request() req) {
    // Validar que el guard haya poblado req.user
    if (!req || !req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const userId = req.user.id;
    try {
      const missions = await this.missionsService.findByUserId(userId);
      return { success: true, data: missions };
    } catch (error) {
      // Propagar HttpException tal cual para no convertir 401/403 en 400
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error?.message || 'Error al obtener misiones');
    }
  }

  @Get('analysis/:analysisId')
  @UseGuards(AuthGuard('jwt'))
  async getByAnalysis(@Param('analysisId') analysisId: number, @Request() req) {
    try {
      if (!req || !req.user) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      // Validar que el usuario sea propietario del análisis
      const analysis = await this.analysisService.findById(Number(analysisId));
      const userId = req.user.id;
      if (Number(analysis.userId) !== Number(userId)) {
        throw new ForbiddenException('No autorizado para ver las misiones de este análisis');
      }

      const missions = await this.missionsService.findByAnalysisId(Number(analysisId));
      return { success: true, data: missions };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error?.message || 'Error al obtener misiones por análisis');
    }
  }

  @Post(':id/mark-fixed')
  async markFixed(@Param('id') id: number) {
    try {
      const m = await this.missionsService.markFixed(Number(id));
      return { success: true, data: m };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/mark-skipped')
  async markSkipped(@Param('id') id: number) {
    try {
      const m = await this.missionsService.markSkipped(Number(id));
      return { success: true, data: m };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
