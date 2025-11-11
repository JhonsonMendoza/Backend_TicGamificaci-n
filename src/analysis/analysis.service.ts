import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisRun, AnalysisStatus } from './entities/analysis-run.entity';
import { FileService, ToolService } from './services';
import { ToolResult } from './services/tool.service';

export interface AnalysisResult {
  id: number;
  student: string;
  originalFileName?: string;
  fileSize?: number;
  status: AnalysisStatus;
  findings?: any;
  totalIssues: number;
  highSeverityIssues: number;
  mediumSeverityIssues: number;
  lowSeverityIssues: number;
  qualityScore: number;
  fileStats?: any;
  createdAt: string;
  completedAt?: string;
  message: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectRepository(AnalysisRun)
    private readonly analysisRunRepository: Repository<AnalysisRun>,
    private readonly fileService: FileService,
    private readonly toolService: ToolService,
  ) {}

  async runPipeline(fileBuffer: Buffer, originalFileName: string, student: string, userId?: number): Promise<AnalysisResult> {
    let analysisRun: AnalysisRun;
    let projectPath: string;

    try {
      // 1. Crear registro inicial
      console.log('=== Creating analysis record ===');
      console.log('Student:', student);
      console.log('User ID:', userId);
      console.log('Original filename:', originalFileName);
      
      analysisRun = this.analysisRunRepository.create({
        student,
        originalFileName,
        status: 'pending',
        projectPath: '',
        userId: userId || null, // Asociar con usuario si está disponible
      });
      analysisRun = await this.analysisRunRepository.save(analysisRun);
      
      console.log('=== Analysis record created ===');
      console.log('Analysis ID:', analysisRun.id);
      console.log('Associated User ID:', analysisRun.userId);
      this.logger.log(`Análisis iniciado con ID: ${analysisRun.id}`);

      // 2. Guardar y extraer archivo
      analysisRun.status = 'processing';
      await this.analysisRunRepository.save(analysisRun);

      projectPath = await this.fileService.saveAndExtractFile(fileBuffer, originalFileName);
      analysisRun.projectPath = projectPath;
      await this.analysisRunRepository.save(analysisRun);

      // 3. Analizar archivos del proyecto
      const fileInfo = await this.fileService.findProjectFiles(projectPath);
      analysisRun.fileStats = {
        totalFiles: fileInfo.allFiles.length,
        javaFiles: fileInfo.javaFiles.length,
        pythonFiles: fileInfo.pythonFiles.length,
        jsFiles: fileInfo.jsFiles.length,
        linesOfCode: await this.countLinesOfCode(fileInfo.allFiles),
      };
      await this.analysisRunRepository.save(analysisRun);

      // 4. Ejecutar herramientas de análisis
      const toolResults = await this.toolService.runAllTools(projectPath, fileInfo);
      analysisRun.toolResults = toolResults;

      // 5. Procesar resultados
      const processedFindings = this.processToolResults(toolResults);
      analysisRun.findings = processedFindings;

      // 6. Calcular métricas
      const metrics = this.calculateMetrics(toolResults);
      analysisRun.totalIssues = metrics.totalIssues;
      analysisRun.highSeverityIssues = metrics.highSeverityIssues;
      analysisRun.mediumSeverityIssues = metrics.mediumSeverityIssues;
      analysisRun.lowSeverityIssues = metrics.lowSeverityIssues;
      analysisRun.qualityScore = metrics.qualityScore;

      // 7. Finalizar análisis
      analysisRun.status = 'completed';
      analysisRun.completedAt = new Date();
      await this.analysisRunRepository.save(analysisRun);

      // 8. Limpiar archivos temporales (opcional)
      // await this.fileService.cleanupProject(projectPath);

      this.logger.log(`Análisis completado con ID: ${analysisRun.id}`);

      // Devolver el análisis en formato esperado por el frontend
      return {
        id: analysisRun.id,
        status: analysisRun.status,
        findings: analysisRun.findings,
        qualityScore: analysisRun.qualityScore,
        message: 'Análisis completado exitosamente',
        student: analysisRun.student,
        originalFileName: analysisRun.originalFileName,
        fileSize: analysisRun.fileSize,
        totalIssues: analysisRun.totalIssues,
        highSeverityIssues: analysisRun.highSeverityIssues,
        mediumSeverityIssues: analysisRun.mediumSeverityIssues,
        lowSeverityIssues: analysisRun.lowSeverityIssues,
        fileStats: analysisRun.fileStats,
        createdAt: analysisRun.createdAt.toISOString(),
        completedAt: analysisRun.completedAt?.toISOString()
      };

    } catch (error) {
      this.logger.error(`Error en análisis: ${error.message}`, error.stack);

      if (analysisRun) {
        analysisRun.status = 'failed';
        analysisRun.errorMessage = error.message;
        await this.analysisRunRepository.save(analysisRun);
      }

      // Limpiar en caso de error
      if (projectPath) {
        await this.fileService.cleanupProject(projectPath);
      }

      throw new Error(`Error en el análisis: ${error.message}`);
    }
  }

  async getAnalysisById(id: number): Promise<AnalysisRun> {
    const analysis = await this.analysisRunRepository.findOne({ where: { id } });
    if (!analysis) {
      throw new NotFoundException(`Análisis con ID ${id} no encontrado`);
    }
    return analysis;
  }

  async getAllAnalyses(): Promise<AnalysisRun[]> {
    return this.analysisRunRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getAnalysesByStudent(student: string): Promise<AnalysisRun[]> {
    return this.analysisRunRepository.find({
      where: { student },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteAnalysis(id: number): Promise<void> {
    const analysis = await this.getAnalysisById(id);
    
    // Limpiar archivos si existen
    if (analysis.projectPath) {
      await this.fileService.cleanupProject(analysis.projectPath);
    }

    await this.analysisRunRepository.remove(analysis);
    this.logger.log(`Análisis eliminado: ${id}`);
  }

  private processToolResults(toolResults: ToolResult[]): any {
    const processed = {
      summary: {
        toolsExecuted: toolResults.length,
        successfulTools: toolResults.filter(r => r.success).length,
        failedTools: toolResults.filter(r => !r.success).length,
      },
      results: {},
    };

    for (const result of toolResults) {
      processed.results[result.tool] = {
        success: result.success,
        findingsCount: result.findings.length,
        findings: result.findings,
        error: result.error,
      };
    }

    return processed;
  }

  private calculateMetrics(toolResults: ToolResult[]): {
    totalIssues: number;
    highSeverityIssues: number;
    mediumSeverityIssues: number;
    lowSeverityIssues: number;
    qualityScore: number;
  } {
    let totalIssues = 0;
    let highSeverityIssues = 0;
    let mediumSeverityIssues = 0;
    let lowSeverityIssues = 0;

    for (const result of toolResults) {
      if (result.success) {
        totalIssues += result.findings.length;

        // Clasificar por severidad según la herramienta
        for (const finding of result.findings) {
          const severity = this.determineSeverity(result.tool, finding);
          switch (severity) {
            case 'high':
              highSeverityIssues++;
              break;
            case 'medium':
              mediumSeverityIssues++;
              break;
            case 'low':
              lowSeverityIssues++;
              break;
          }
        }
      }
    }

    // Calcular score de calidad (0-100)
    let qualityScore = 100;
    if (totalIssues > 0) {
      qualityScore = Math.max(0, 100 - (highSeverityIssues * 10 + mediumSeverityIssues * 5 + lowSeverityIssues * 2));
    }

    return {
      totalIssues,
      highSeverityIssues,
      mediumSeverityIssues,
      lowSeverityIssues,
      qualityScore: Math.round(qualityScore * 100) / 100,
    };
  }

  private determineSeverity(tool: string, finding: any): 'high' | 'medium' | 'low' {
    try {
      switch (tool) {
        case 'spotbugs':
          // Manejar tanto formato XML como formato de demostración
          const priority = finding.$?.priority || finding.priority;
          if (priority === '1') return 'high';
          if (priority === '2') return 'medium';
          return 'low';
          
        case 'pmd':
          // Para PMD, usar el nivel de priority
          const pmdPriority = finding.priority;
          if (pmdPriority === '1' || pmdPriority === '2') return 'high';
          if (pmdPriority === '3') return 'medium';
          return 'low';
          
        case 'semgrep':
          // Para Semgrep, usar severity
          const severity = finding.severity?.toLowerCase() || finding.extra?.severity?.toLowerCase();
          if (severity === 'error') return 'high';
          if (severity === 'warning') return 'medium';
          return 'low';
          
        case 'eslint':
          const eslintSeverity = finding.severity;
          if (eslintSeverity === 2) return 'high';
          if (eslintSeverity === 1) return 'medium';
          return 'low';
          
        default:
          return 'medium';
      }
    } catch (error) {
      // Si hay cualquier error, devolver severidad media por defecto
      this.logger.warn(`Error determinando severidad para ${tool}: ${error.message}`);
      return 'medium';
    }
  }

  private async countLinesOfCode(filePaths: string[]): Promise<number> {
    let totalLines = 0;
    
    const codeExtensions = ['.java', '.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.c', '.h'];
    
    for (const filePath of filePaths) {
      const isCodeFile = codeExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
      if (isCodeFile) {
        try {
          const content = await this.fileService.readFileContent(filePath);
          const lines = content.split('\n').filter(line => line.trim() !== '').length;
          totalLines += lines;
        } catch (error) {
          // Ignorar archivos que no se pueden leer
        }
      }
    }
    
    return totalLines;
  }

  /**
   * Encontrar análisis por ID
   */
  async findById(id: number): Promise<AnalysisRun> {
    const analysis = await this.analysisRunRepository.findOne({ where: { id } });
    if (!analysis) {
      throw new NotFoundException(`Análisis con ID ${id} no encontrado`);
    }
    return analysis;
  }

  /**
   * Encontrar todos los análisis
   */
  async findAll(): Promise<AnalysisRun[]> {
    return this.analysisRunRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Encontrar análisis por estudiante
   */
  async findByStudent(student: string): Promise<AnalysisRun[]> {
    return this.analysisRunRepository.find({
      where: { student },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Eliminar análisis
   */
  async delete(id: number): Promise<void> {
    const analysis = await this.findById(id);
    
    // Limpiar archivos del proyecto
    try {
      await this.fileService.cleanupProject(analysis.projectPath);
    } catch (error) {
      this.logger.warn(`No se pudieron limpiar los archivos del proyecto: ${error.message}`);
    }

    await this.analysisRunRepository.remove(analysis);
  }

  /**
   * Obtener resumen de estudiante
   */
  async getStudentSummary(student: string): Promise<{
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    pendingAnalyses: number;
    averageQualityScore: number;
    totalIssues: number;
    recentAnalyses: AnalysisRun[];
  }> {
    const analyses = await this.findByStudent(student);
    
    const completedAnalyses = analyses.filter(a => a.status === 'completed');
    const failedAnalyses = analyses.filter(a => a.status === 'failed');
    const pendingAnalyses = analyses.filter(a => a.status === 'pending' || a.status === 'processing');

    const avgScore = completedAnalyses.length > 0 
      ? completedAnalyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / completedAnalyses.length
      : 0;

    const totalIssues = analyses.reduce((sum, a) => sum + a.totalIssues, 0);

    return {
      totalAnalyses: analyses.length,
      completedAnalyses: completedAnalyses.length,
      failedAnalyses: failedAnalyses.length,
      pendingAnalyses: pendingAnalyses.length,
      averageQualityScore: Number(avgScore.toFixed(2)),
      totalIssues,
      recentAnalyses: analyses.slice(0, 5)
    };
  }

  /**
   * Obtener estadísticas generales
   */
  async getStats(): Promise<{
    totalAnalyses: number;
    completedToday: number;
    averageScore: number;
    topStudents: Array<{student: string; score: number; analysesCount: number}>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalAnalyses = await this.analysisRunRepository.count();
    const completedToday = await this.analysisRunRepository.count({
      where: {
        status: 'completed',
        createdAt: new Date(today)
      }
    });

    const completedAnalyses = await this.analysisRunRepository.find({
      where: { status: 'completed' }
    });

    const avgScore = completedAnalyses.length > 0
      ? completedAnalyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / completedAnalyses.length
      : 0;

    // Calcular top estudiantes
    const studentStats = new Map<string, { totalScore: number; count: number }>();
    
    completedAnalyses.forEach(analysis => {
      const current = studentStats.get(analysis.student) || { totalScore: 0, count: 0 };
      current.totalScore += analysis.qualityScore || 0;
      current.count++;
      studentStats.set(analysis.student, current);
    });

    const topStudents = Array.from(studentStats.entries())
      .map(([student, stats]) => ({
        student,
        score: Number((stats.totalScore / stats.count).toFixed(2)),
        analysesCount: stats.count
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalAnalyses,
      completedToday,
      averageScore: Number(avgScore.toFixed(2)),
      topStudents
    };
  }

  /**
   * Agregar findings de demostración cuando las herramientas no detecten problemas reales
   * Esto es temporal para demostración hasta que las herramientas estén correctamente configuradas
   */
  private addDemoFindings(toolResults: ToolResult[]): ToolResult[] {
    return toolResults.map(result => {
      if (result.success && result.findings.length === 0) {
        // Agregar findings de demostración según la herramienta
        if (result.tool === 'spotbugs') {
          result.findings = [
            {
              type: 'NP_NULL_ON_SOME_PATH',
              priority: '2',
              rank: '18',
              abbrev: 'NP',
              category: 'CORRECTNESS',
              message: 'Possible null pointer dereference in main method',
              sourceLine: { start: '11', end: '11', sourcefile: 'Main.java' }
            },
            {
              type: 'OBL_UNSATISFIED_OBLIGATION_EXCEPTION_EDGE',
              priority: '2',
              rank: '14', 
              abbrev: 'OBL',
              category: 'CORRECTNESS',
              message: 'Method may fail to clean up stream or resource on checked exception',
              sourceLine: { start: '16', end: '19', sourcefile: 'Main.java' }
            }
          ];
          result.rawOutput = `SpotBugs found ${result.findings.length} bugs`;
        } else if (result.tool === 'pmd') {
          result.findings = [
            {
              priority: '3',
              rule: 'UnusedLocalVariable',
              ruleset: 'Best Practices',
              message: 'Avoid unused local variables such as \'unused\'',
              sourceLine: { beginline: '14', endline: '14', sourcefile: 'Main.java' }
            },
            {
              priority: '2',
              rule: 'EmptyCatchBlock', 
              ruleset: 'Error Prone',
              message: 'Avoid empty catch blocks',
              sourceLine: { beginline: '31', endline: '33', sourcefile: 'Main.java' }
            },
            {
              priority: '4',
              rule: 'AvoidPrintStackTrace',
              ruleset: 'Best Practices', 
              message: 'Avoid printStackTrace(); consider using a logger instead',
              sourceLine: { beginline: '19', endline: '19', sourcefile: 'Main.java' }
            }
          ];
          result.rawOutput = `PMD found ${result.findings.length} violations`;
        } else if (result.tool === 'semgrep') {
          result.success = true;
          result.findings = [
            {
              check_id: 'java.lang.security.audit.hardcoded-secret',
              message: 'Hardcoded secret found',
              severity: 'WARNING',
              path: 'Main.java',
              start: { line: 6, col: 32 },
              end: { line: 6, col: 42 }
            },
            {
              check_id: 'java.lang.security.audit.sql-injection',
              message: 'Possible SQL injection vulnerability',
              severity: 'ERROR', 
              path: 'Main.java',
              start: { line: 24, col: 21 },
              end: { line: 24, col: 64 }
            },
            {
              check_id: 'javascript.lang.security.audit.hardcoded-secret',
              message: 'Hardcoded API key found',
              severity: 'ERROR',
              path: 'vulnerable.js', 
              start: { line: 3, col: 19 },
              end: { line: 3, col: 41 }
            }
          ];
          result.rawOutput = `Semgrep found ${result.findings.length} security issues`;
          delete result.error;
        }
      }
      return result;
    });
  }

  // Método auxiliar para mapear entidades a resultados
  private mapToAnalysisResult(analysis: AnalysisRun): AnalysisResult {
    return {
      id: analysis.id,
      student: analysis.student,
      originalFileName: analysis.originalFileName,
      fileSize: analysis.fileSize,
      status: analysis.status,
      findings: analysis.findings,
      totalIssues: analysis.totalIssues || 0,
      highSeverityIssues: analysis.highSeverityIssues || 0,
      mediumSeverityIssues: analysis.mediumSeverityIssues || 0,
      lowSeverityIssues: analysis.lowSeverityIssues || 0,
      qualityScore: typeof analysis.qualityScore === 'string' 
        ? parseFloat(analysis.qualityScore) 
        : analysis.qualityScore || 0,
      fileStats: analysis.fileStats,
      createdAt: analysis.createdAt.toISOString(),
      completedAt: analysis.completedAt?.toISOString(),
      message: analysis.status === 'completed' 
        ? 'Análisis completado correctamente' 
        : analysis.errorMessage || 'Análisis en proceso'
    };
  }

  // Nuevos métodos para usuarios autenticados
  async findByUserId(userId: number, limit: number = 10): Promise<AnalysisResult[]> {
    const analyses = await this.analysisRunRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return analyses.map(analysis => this.mapToAnalysisResult(analysis));
  }

  async getUserSummary(userId: number): Promise<{
    totalAnalyses: number;
    averageScore: number;
    totalIssues: number;
    highSeverityIssues: number;
    mediumSeverityIssues: number;
    lowSeverityIssues: number;
    recentAnalyses: AnalysisResult[];
  }> {
    const analyses = await this.analysisRunRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const totalAnalyses = analyses.length;
    
    // Calcular promedios y totales
    const completedAnalyses = analyses.filter(a => a.status === 'completed');
    
    const averageScore = completedAnalyses.length > 0
      ? completedAnalyses.reduce((sum, a) => {
          const score = typeof a.qualityScore === 'string' ? parseFloat(a.qualityScore) : (a.qualityScore || 0);
          return sum + score;
        }, 0) / completedAnalyses.length
      : 0;

    const totalIssues = completedAnalyses.reduce((sum, a) => sum + (a.totalIssues || 0), 0);
    const highSeverityIssues = completedAnalyses.reduce((sum, a) => sum + (a.highSeverityIssues || 0), 0);
    const mediumSeverityIssues = completedAnalyses.reduce((sum, a) => sum + (a.mediumSeverityIssues || 0), 0);
    const lowSeverityIssues = completedAnalyses.reduce((sum, a) => sum + (a.lowSeverityIssues || 0), 0);

    // Últimos 5 análisis
    const recentAnalyses = analyses.slice(0, 5).map(analysis => this.mapToAnalysisResult(analysis));

    return {
      totalAnalyses,
      averageScore,
      totalIssues,
      highSeverityIssues,
      mediumSeverityIssues,
      lowSeverityIssues,
      recentAnalyses,
    };
  }
}
