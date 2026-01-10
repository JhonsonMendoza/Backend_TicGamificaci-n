import { Controller, Get, Post, Param, UseGuards, Request, BadRequestException, UploadedFile, UseInterceptors, UnauthorizedException, HttpException, ForbiddenException, ParseIntPipe } from '@nestjs/common';
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
    const userEmail = req.user.email;
    const userName = req.user.name;
    try {
      const missions = await this.missionsService.findByUserId(userId, userEmail, userName);
      return { success: true, data: missions };
    } catch (error) {
      // Propagar HttpException tal cual para no convertir 401/403 en 400
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error?.message || 'Error al obtener misiones');
    }
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getMissionsStats(@Request() req) {
    if (!req || !req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;
    try {
      const missions = await this.missionsService.findByUserId(userId, userEmail, userName);
      
      const total = missions.length;
      const completed = missions.filter(m => m.status === 'fixed').length;
      const pending = missions.filter(m => m.status === 'pending').length;
      const skipped = missions.filter(m => m.status === 'skipped').length;

      return {
        success: true,
        data: {
          total,
          completed,
          pending,
          skipped,
          completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error?.message || 'Error al obtener estadísticas de misiones');
    }
  }

  @Get('analysis/:analysisId')
  @UseGuards(AuthGuard('jwt'))
  async getByAnalysis(@Param('analysisId', ParseIntPipe) analysisId: number, @Request() req) {
    try {
      if (!req || !req.user) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      // Validar que el usuario sea propietario del análisis
      const analysis = await this.analysisService.findById(analysisId);
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userName = req.user.name;

      // Permitir acceso si:
      // 1. El análisis tiene userId y coincide
      // 2. El análisis tiene student (nombre/email) y coincide
      const isOwner = 
        (analysis.userId && Number(analysis.userId) === Number(userId)) ||
        (analysis.student && (analysis.student === userEmail || analysis.student === userName));

      if (!isOwner) {
        console.log(`[FORBIDDEN] Usuario ${userId} intenta acceder a análisis ${analysisId}. Student en BD: ${analysis.student}, UserId en BD: ${analysis.userId}`);
        throw new ForbiddenException('No autorizado para ver las misiones de este análisis');
      }

      const missions = await this.missionsService.findByAnalysisId(analysisId);
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
