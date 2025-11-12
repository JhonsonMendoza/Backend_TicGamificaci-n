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

  // Re-analyze endpoint for a specific mission (upload corrected project)
  @Post(':id/reanalyze')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async reanalyzeMission(@Param('id') id: number, @UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) throw new BadRequestException('Archivo requerido para re-análisis');

      const mission = await this.missionsService.findById(Number(id));
      // Re-analizar el análisis asociado
      const analysis = await this.analysisService.findById(mission.analysisRunId);

      // Validar propietario
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedException('Usuario no autenticado');
      if (Number(analysis.userId) !== Number(userId)) {
        throw new ForbiddenException('No autorizado para re-análisis de esta misión');
      }

      // Ejecutar pipeline con same student y userId del solicitante
      const result = await this.analysisService.runPipeline(file.buffer, file.originalname, analysis.student, userId);

      // Si el nuevo análisis no presenta el problema, marcar misión como fixed
      const stillPresent = this.checkIfFindingStillPresent(result.findings, mission);
      if (!stillPresent) {
        await this.missionsService.markFixed(mission.id);
      }

      return { success: true, data: result, missionUpdated: !stillPresent };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error?.message || 'Error en re-análisis de misión');
    }
  }

  private checkIfFindingStillPresent(findings: any, mission: any): boolean {
    try {
      if (!findings) return false;
      // findings puede venir como processed.results o raw array
      const allFindings: any[] = [];
      if (findings.results) {
        for (const key of Object.keys(findings.results)) {
          const fr = findings.results[key].findings || findings.results[key];
          if (Array.isArray(fr)) allFindings.push(...fr);
        }
      } else if (Array.isArray(findings)) {
        allFindings.push(...findings);
      }

      return allFindings.some(f => {
        const path = f.path || f.sourceLine?.sourcefile || f.sourcefile || f.fileName || f.filename || f['$']?.sourcefile;
        const start = f.start?.line || f.sourceLine?.beginline || f.$?.start || f.startLine || null;
        const end = f.end?.line || f.sourceLine?.endline || f.$?.end || f.endLine || null;

        if (!path) return false;
        const matchesPath = mission.filePath ? path.endsWith(mission.filePath) || path === mission.filePath : true;
        const matchesLine = mission.lineStart ? (start && Number(start) >= mission.lineStart && Number(start) <= (mission.lineEnd || mission.lineStart)) : true;

        return matchesPath && matchesLine;
      });
    } catch (error) {
      return false;
    }
  }
}
