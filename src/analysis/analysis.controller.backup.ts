import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Param, 
  Query,
  UploadedFile, 
  UseInterceptors, 
  Body,
  BadRequestException,
  ParseIntPipe,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProject(
    @UploadedFile() file: Express.Multer.File, 
    @Body('student') student: string
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    if (!student) {
      throw new BadRequestException('El nombre del estudiante es requerido');
    }

    try {
      const result = await this.analysisService.runPipeline(
        file.buffer, 
        file.originalname, 
        student
      );

      return {
        success: true,
        data: result,
        message: 'Proyecto analizado exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al procesar el archivo',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getAnalysis(@Param('id', ParseIntPipe) id: number) {
    try {
      const analysis = await this.analysisService.getAnalysisById(id);
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Análisis no encontrado',
          error: error.message
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Get()
  async getAllAnalyses(@Query('student') student?: string) {
    try {
      let analyses;
      
      if (student) {
        analyses = await this.analysisService.getAnalysesByStudent(student);
      } else {
        analyses = await this.analysisService.getAllAnalyses();
      }

      return {
        success: true,
        data: analyses,
        count: analyses.length
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener los análisis',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async deleteAnalysis(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.analysisService.deleteAnalysis(id);
      return {
        success: true,
        message: 'Análisis eliminado correctamente'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al eliminar el análisis',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('student/:student/summary')
  async getStudentSummary(@Param('student') student: string) {
    try {
      const analyses = await this.analysisService.getAnalysesByStudent(student);
      
      const summary = {
        totalAnalyses: analyses.length,
        completedAnalyses: analyses.filter(a => a.status === 'completed').length,
        failedAnalyses: analyses.filter(a => a.status === 'failed').length,
        pendingAnalyses: analyses.filter(a => a.status === 'pending' || a.status === 'processing').length,
        averageQualityScore: analyses
          .filter(a => a.qualityScore !== null)
          .reduce((sum, a) => sum + a.qualityScore, 0) / Math.max(1, analyses.filter(a => a.qualityScore !== null).length),
        totalIssues: analyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0),
        recentAnalyses: analyses.slice(0, 5)
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener el resumen del estudiante',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
