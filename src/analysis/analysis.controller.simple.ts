import { 
  Controller, 
  Post, 
  Get, 
  Body,
  UploadedFile, 
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('analysis')
export class AnalysisController {
  
  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'API de análisis funcionando correctamente',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/analysis/health - Estado de la API',
        'POST /api/analysis/upload - Subir archivo para análisis',
        'GET /api/analysis/demo-data - Datos de ejemplo'
      ]
    };
  }

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

    // Simulación de análisis sin base de datos
    const mockAnalysis = {
      id: Math.floor(Math.random() * 1000),
      student: student,
      originalFileName: file.originalname,
      fileSize: file.size,
      status: 'completed',
      findings: {
        summary: {
          toolsExecuted: 3,
          successfulTools: 3,
          failedTools: 0,
        },
        results: {
          spotbugs: {
            success: true,
            findingsCount: 5,
            findings: [
              { type: 'bug', priority: 'high', message: 'Posible null pointer exception' },
              { type: 'style', priority: 'low', message: 'Variable no utilizada' }
            ]
          },
          semgrep: {
            success: true,
            findingsCount: 3,
            findings: [
              { type: 'security', severity: 'medium', message: 'Uso de función insegura' }
            ]
          },
          eslint: {
            success: true,
            findingsCount: 8,
            findings: [
              { type: 'style', severity: 'low', message: 'Punto y coma faltante' }
            ]
          }
        }
      },
      totalIssues: 16,
      highSeverityIssues: 1,
      mediumSeverityIssues: 7,
      lowSeverityIssues: 8,
      qualityScore: 78.5,
      fileStats: {
        totalFiles: 12,
        javaFiles: 8,
        jsFiles: 4,
        pythonFiles: 0,
        linesOfCode: 1250
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: mockAnalysis,
      message: `Proyecto de ${student} analizado exitosamente (modo demo)`
    };
  }

  @Get('demo-data')
  getDemoData() {
    return {
      success: true,
      data: [
        {
          id: 1,
          student: 'juan_perez',
          status: 'completed',
          qualityScore: 85.2,
          totalIssues: 12,
          createdAt: '2024-09-24T20:30:00Z'
        },
        {
          id: 2,
          student: 'maria_garcia',
          status: 'completed', 
          qualityScore: 92.1,
          totalIssues: 5,
          createdAt: '2024-09-24T21:15:00Z'
        },
        {
          id: 3,
          student: 'carlos_lopez',
          status: 'processing',
          qualityScore: null,
          totalIssues: 0,
          createdAt: '2024-09-24T22:00:00Z'
        }
      ],
      count: 3,
      message: 'Datos de ejemplo - modo demo'
    };
  }

  @Get(':id')
  getAnalysisById(@Body('id') id: string) {
    const mockAnalysis = {
      id: parseInt(id) || 1,
      student: 'estudiante_demo',
      originalFileName: 'proyecto_demo.zip',
      status: 'completed',
      findings: {
        summary: {
          toolsExecuted: 3,
          successfulTools: 3,
          failedTools: 0,
        },
        results: {
          spotbugs: {
            success: true,
            findingsCount: 5,
            findings: [
              { 
                type: 'bug', 
                priority: 'high', 
                message: 'Posible null pointer exception en línea 45',
                file: 'src/main/java/Main.java'
              },
              { 
                type: 'performance', 
                priority: 'medium', 
                message: 'Uso ineficiente de StringBuilder',
                file: 'src/main/java/Utils.java'
              }
            ]
          },
          semgrep: {
            success: true,
            findingsCount: 3,
            findings: [
              { 
                type: 'security', 
                severity: 'high', 
                message: 'Posible inyección SQL',
                file: 'src/main/java/Database.java'
              }
            ]
          }
        }
      },
      totalIssues: 16,
      highSeverityIssues: 2,
      mediumSeverityIssues: 6,
      lowSeverityIssues: 8,
      qualityScore: 78.5,
      fileStats: {
        totalFiles: 15,
        javaFiles: 10,
        jsFiles: 3,
        pythonFiles: 2,
        linesOfCode: 1850
      },
      createdAt: '2024-09-24T20:30:00Z',
      completedAt: '2024-09-24T20:33:15Z'
    };

    return {
      success: true,
      data: mockAnalysis
    };
  }
}