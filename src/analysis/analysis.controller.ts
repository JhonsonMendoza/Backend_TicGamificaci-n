import { 
  Controller, 
  Post, 
  Get, 
  Body,
  UploadedFile, 
  UseInterceptors,
  BadRequestException,
  Param,
  Query,
  ParseIntPipe,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  
  constructor(private readonly analysisService: AnalysisService) {}
  
  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'API de análisis funcionando correctamente',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/analysis/health - Estado de la API',
        'POST /api/analysis/upload - Subir archivo para análisis',
        'GET /api/analysis/demo-data - Datos de ejemplo',
        'GET /api/analysis - Listar todos los análisis',
        'GET /api/analysis/:id - Obtener análisis por ID',
        'DELETE /api/analysis/:id - Eliminar análisis',
        'GET /api/analysis/student/:student/summary - Resumen por estudiante'
      ]
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProject(
    @UploadedFile() file: Express.Multer.File, 
    @Body('student') student: string
  ) {
    console.log('=== DEBUG UPLOAD ===');
    console.log('File received:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    } : 'No file');
    console.log('Student:', student);
    
    if (!file) {
      console.error('ERROR: No file provided');
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    if (!student) {
      console.error('ERROR: No student provided');
      throw new BadRequestException('El nombre del estudiante es requerido');
    }

    try {
      console.log('Starting analysis pipeline...');
      // Ejecutar el pipeline real de análisis
      const result = await this.analysisService.runPipeline(
        file.buffer,
        file.originalname,
        student
      );

      console.log('Analysis completed successfully:', result.id);
      return {
        success: true,
        message: 'Archivo analizado correctamente',
        data: result
      };
    } catch (error) {
      console.error('ERROR in analysis pipeline:', error);
      throw new BadRequestException(`Error en el análisis: ${error.message}`);
    }
  }

  @Post('upload-auth')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadProjectAuth(
    @UploadedFile() file: Express.Multer.File, 
    @Request() req,
    @Body('student') student?: string
  ) {
    console.log('=== DEBUG UPLOAD (Authenticated) ===');
    console.log('File received:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    } : 'No file');
    console.log('User:', req.user?.email);
    console.log('Student param:', student);
    
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    // Si el usuario está autenticado, usar su email como student si no se proporciona
    const studentName = student || req.user.email || req.user.name;

    try {
      console.log('=== Starting authenticated analysis pipeline ===');
      console.log('User ID:', req.user.id);
      console.log('User Email:', req.user.email);
      console.log('Student Name:', studentName);
      
      const result = await this.analysisService.runPipeline(
        file.buffer,
        file.originalname,
        studentName,
        req.user.id // userId del usuario autenticado
      );
      
      console.log('=== Analysis completed for authenticated user ===');
      console.log('Analysis ID:', result.id);
      console.log('User ID associated:', req.user.id);

      console.log('Authenticated analysis completed successfully:', result.id);
      return {
        success: true,
        message: 'Archivo analizado correctamente',
        data: result,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      };
    } catch (error) {
      console.error('ERROR during authenticated analysis:', error);
      return {
        success: false,
        message: 'Error durante el análisis',
        error: error.message
      };
    }
  }

  @Get('demo-data')
  async getDemoData() {
    // Datos demo mejorados para desarrollo
    const demoData = [
      {
        id: 1,
        student: 'juan_perez',
        originalFileName: 'proyecto_java.zip',
        status: 'completed',
        qualityScore: 85.2,
        totalIssues: 15,
        highSeverityIssues: 3,
        mediumSeverityIssues: 8,
        lowSeverityIssues: 4,
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 día atrás
      },
      {
        id: 2,
        student: 'maria_garcia',
        originalFileName: 'proyecto_react.zip',
        status: 'completed',
        qualityScore: 92.1,
        totalIssues: 8,
        highSeverityIssues: 0,
        mediumSeverityIssues: 5,
        lowSeverityIssues: 3,
        createdAt: new Date(Date.now() - 43200000).toISOString() // 12 horas atrás
      },
      {
        id: 3,
        student: 'carlos_lopez',
        originalFileName: 'proyecto_python.zip',
        status: 'processing',
        qualityScore: null,
        totalIssues: 0,
        highSeverityIssues: 0,
        mediumSeverityIssues: 0,
        lowSeverityIssues: 0,
        createdAt: new Date().toISOString()
      }
    ];

    return {
      success: true,
      data: demoData,
      count: demoData.length,
      message: 'Datos de demostración - Configura PostgreSQL para datos reales'
    };
  }

  @Get(':id')
  async getAnalysisById(@Param('id', ParseIntPipe) id: number) {
    try {
      const analysis = await this.analysisService.findById(id);
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  async getAnalyses(@Query('student') student?: string) {
    try {
      const analyses = student 
        ? await this.analysisService.findByStudent(student)
        : await this.analysisService.findAll();
      
      return {
        success: true,
        data: analyses
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  async deleteAnalysis(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.analysisService.delete(id);
      return {
        success: true,
        message: 'Análisis eliminado correctamente'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('student/:student/summary')
  async getStudentSummary(@Param('student') student: string) {
    try {
      const summary = await this.analysisService.getStudentSummary(student);
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Endpoints para usuarios autenticados
  @Get('my/analyses')
  @UseGuards(AuthGuard('jwt'))
  async getMyAnalyses(@Request() req, @Query('limit') limit?: string) {
    try {
      const userId = req.user.id;
      const limitNumber = limit ? parseInt(limit, 10) : 10;
      const analyses = await this.analysisService.findByUserId(userId, limitNumber);
      
      return {
        success: true,
        data: analyses,
        count: analyses.length,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('my/summary')
  @UseGuards(AuthGuard('jwt'))
  async getMySummary(@Request() req) {
    try {
      const userId = req.user.id;
      const summary = await this.analysisService.getUserSummary(userId);
      
      return {
        success: true,
        data: summary,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}