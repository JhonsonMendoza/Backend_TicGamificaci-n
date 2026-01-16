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
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { AnalysisService } from './analysis.service';
import { MissionsService } from './missions.service';

@Controller('analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);
  
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly missionsService: MissionsService
  ) {}
  
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
    const studentName = student || req.user?.name || req.user?.email || `Usuario_${req.user?.id}` || 'Anónimo';

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

  @Post('clone-repo')
  @UseGuards(AuthGuard('jwt'))
  async cloneAndAnalyzeRepository(
    @Request() req,
    @Body() body: { repositoryUrl: string; student?: string }
  ) {
    this.logger.log('📦 Solicitud de clonación de repositorio recibida');
    this.logger.log(`   URL: ${body.repositoryUrl}`);
    this.logger.log(`   Usuario: ${req.user?.email}`);

    if (!body.repositoryUrl) {
      throw new BadRequestException('La URL del repositorio es requerida');
    }

    const studentName = body.student || req.user?.name || req.user?.email || `Usuario_${req.user?.id}`;

    try {
      this.logger.log('⏳ Iniciando clonación del repositorio...');
      const result = await this.analysisService.cloneAndAnalyzeRepository(
        body.repositoryUrl,
        studentName,
        req.user.id
      );

      this.logger.log('✅ Análisis completado exitosamente');
      return {
        success: true,
        message: 'Repositorio clonado y analizado correctamente',
        data: result,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error durante análisis de repo: ${error.message}`);
      throw new BadRequestException(`Error al clonar/analizar repositorio: ${error.message}`);
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
  async getAnalysis(@Param('id', ParseIntPipe) id: number) {
    const analysis = await this.analysisService.findById(id);
    
    // Logging detallado para debug
    this.logger.log(`📋 [GET /:id] Análisis ${id} solicitado`);
    this.logger.log(`  ├─ Estado: ${analysis.status}`);
    this.logger.log(`  ├─ Problemas totales: ${analysis.totalIssues}`);
    this.logger.log(`  ├─ Altos: ${analysis.highSeverityIssues}`);
    this.logger.log(`  ├─ Medios: ${analysis.mediumSeverityIssues}`);
    this.logger.log(`  ├─ Bajos: ${analysis.lowSeverityIssues}`);
    
    if (analysis.findings && analysis.findings.results) {
      Object.keys(analysis.findings.results).forEach(tool => {
        const count = analysis.findings.results[tool].findingsCount || 0;
        this.logger.log(`  ├─ ${tool}: ${count} hallazgos`);
      });
    }
    
    return {
      success: true,
      data: analysis
    };
  }

  /**
   * ENDPOINT DEBUG: Ver todas las misiones de un análisis
   */
  @Get(':id/missions-debug')
  async getAnalysisMissionsDebug(@Param('id', ParseIntPipe) id: number) {
    const analysis = await this.analysisService.findById(id);
    const missions = await this.missionsService.findByAnalysisId(id);
    
    this.logger.log(`🔍 [DEBUG MISSIONS] Análisis ${id}`);
    this.logger.log(`  Total misiones en BD: ${missions.length}`);
    
    // Información de findings almacenados
    this.logger.log(`📊 Findings almacenados en análisis:`);
    if (analysis.findings && analysis.findings.results) {
      Object.keys(analysis.findings.results).forEach(tool => {
        const count = analysis.findings.results[tool].findingsCount || 0;
        this.logger.log(`  ${tool}: ${count} hallazgos`);
      });
    }
    
    const groupedByTool: { [key: string]: any[] } = {};
    const groupedBySeverity: { [key: string]: any[] } = {};
    
    missions.forEach(m => {
      const tool = m.metadata?.tool || 'unknown';
      const severity = m.severity || 'unknown';
      
      if (!groupedByTool[tool]) groupedByTool[tool] = [];
      if (!groupedBySeverity[severity]) groupedBySeverity[severity] = [];
      
      groupedByTool[tool].push(m);
      groupedBySeverity[severity].push(m);
    });
    
    this.logger.log(`  Por herramienta (misiones):`);
    Object.keys(groupedByTool).forEach(tool => {
      this.logger.log(`    ${tool}: ${groupedByTool[tool].length}`);
    });
    
    this.logger.log(`  Por severidad:`);
    Object.keys(groupedBySeverity).forEach(sev => {
      this.logger.log(`    ${sev}: ${groupedBySeverity[sev].length}`);
    });
    
    return {
      success: true,
      data: {
        analysisId: id,
        status: analysis.status,
        totalMissions: missions.length,
        storedFindings: analysis.findings?.results || {},
        missions: missions.map(m => ({
          id: m.id,
          title: m.title,
          severity: m.severity,
          filePath: m.filePath,
          lineStart: m.lineStart,
          tool: m.metadata?.tool || 'unknown',
          status: m.status
        })),
        groupedByTool: Object.keys(groupedByTool).reduce((acc, tool) => {
          acc[tool] = groupedByTool[tool].length;
          return acc;
        }, {} as any),
        groupedBySeverity: Object.keys(groupedBySeverity).reduce((acc, sev) => {
          acc[sev] = groupedBySeverity[sev].length;
          return acc;
        }, {} as any)
      }
    };
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
      const userEmail = req.user.email;
      const userName = req.user.name;
      const limitNumber = limit ? parseInt(limit, 10) : 10;
      const analyses = await this.analysisService.findByUserId(userId, limitNumber, userEmail, userName);
      
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
      const userEmail = req.user.email;
      const userName = req.user.name;
      const summary = await this.analysisService.getUserSummary(userId, userEmail, userName);
      
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

  @Post(':id/reanalyze')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async reanalyzeAnalysis(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { repositoryUrl?: string },
    @Request() req,
  ) {
    try {
      const analysis = await this.analysisService.findById(id);

      // Validar que el usuario autenticado sea el propietario
      const userId = req.user?.id;
      if (!userId || Number(analysis.userId) !== Number(userId)) {
        throw new BadRequestException('No autorizado para re-análisis de este análisis');
      }

      const studentName = analysis.student || req.user?.name || req.user?.email || `Usuario_${req.user?.id}` || 'Anónimo';
      let result;

      // Si el análisis original fue por repositorio y se proporciona URL, usar re-análisis por repo
      if (body.repositoryUrl) {
        result = await this.analysisService.reanalyzeFromRepository(
          id,
          body.repositoryUrl,
          studentName,
          userId
        );
      } else if (file) {
        // Re-análisis por archivo ZIP
        result = await this.analysisService.runPipeline(
          file.buffer, 
          file.originalname, 
          studentName, 
          userId,
          id // ID del análisis anterior para re-análisis
        );
      } else {
        throw new BadRequestException('Se requiere un archivo ZIP o URL de repositorio para el re-análisis');
      }

      const isSameProject = result.id === id;
      return {
        success: true,
        message: isSameProject 
          ? 'Re-análisis completado. Proyecto actualizado correctamente.' 
          : '⚠️ El proyecto enviado es diferente al original. Se ha creado un nuevo análisis.',
        data: result,
        isSameProject,
        isNewProject: !isSameProject,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}