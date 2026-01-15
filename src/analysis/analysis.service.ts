import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisRun, AnalysisStatus } from './entities/analysis-run.entity';
import { FileService, ToolService } from './services';
import { ToolResult } from './services/tool.service';
import { MissionsService } from './missions.service';
import { AchievementsService } from '../auth/services/achievements.service';

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
    private readonly missionsService: MissionsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async runPipeline(fileBuffer: Buffer, originalFileName: string, student: string, userId?: number, reanalysisOfId?: number): Promise<AnalysisResult> {
    let analysisRun: AnalysisRun;
    let projectPath: string;
    let isReanalysis = !!reanalysisOfId;
    let previousAnalysis: AnalysisRun | null = null;

    try {
      // Si es re-análisis, cargar el análisis anterior
      if (isReanalysis) {
        previousAnalysis = await this.analysisRunRepository.findOne({ 
          where: { id: reanalysisOfId },
          relations: ['user']
        });
        
        if (!previousAnalysis) {
          throw new Error('Análisis anterior no encontrado');
        }
      }

      // 1. Crear registro inicial (o reutilizar si es re-análisis del mismo proyecto)
      console.log('=== Creating analysis record ===');
      console.log('Student:', student);
      console.log('User ID:', userId);
      console.log('Original filename:', originalFileName);
      console.log('Is Reanalysis:', isReanalysis);
      
      analysisRun = this.analysisRunRepository.create({
        student,
        originalFileName,
        status: 'pending',
        projectPath: '',
        userId: userId || null,
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

      // 3.1 Si es re-análisis, verificar si es el mismo proyecto
      if (isReanalysis && previousAnalysis) {
        const isSameProject = this.compareProjectStructure(
          previousAnalysis.fileStats,
          analysisRun.fileStats,
          fileInfo
        );

        console.log('=== Project comparison ===');
        console.log('Is same project:', isSameProject);

        if (isSameProject) {
          // Es el mismo proyecto: actualizar el análisis existente en lugar de crear uno nuevo
          console.log('Detected same project - updating existing analysis');
          
          // Copiar datos importantes del análisis temporal al anterior
          previousAnalysis.originalFileName = analysisRun.originalFileName;
          previousAnalysis.projectPath = analysisRun.projectPath;
          previousAnalysis.fileStats = analysisRun.fileStats;
          previousAnalysis.status = 'processing';
          
          await this.analysisRunRepository.save(previousAnalysis);
          
          // Eliminar el análisis temporal
          await this.analysisRunRepository.delete(analysisRun.id);
          
          // Usar el análisis anterior como el actual
          analysisRun = previousAnalysis;
          
          this.logger.log(`Re-análisis: actualizando análisis existente ID: ${analysisRun.id}`);
        } else {
          // Es un proyecto diferente: mantener el nuevo análisis
          console.log('Detected different project - creating new analysis record');
          this.logger.log(`Re-análisis: proyecto diferente detectado, creando nuevo análisis ID: ${analysisRun.id}`);
        }
      }

      await this.analysisRunRepository.save(analysisRun);

      // 4. Ejecutar herramientas de análisis
      const toolResults = await this.toolService.runAllTools(projectPath, fileInfo);
      analysisRun.toolResults = toolResults;

      // 5. Procesar resultados
      const processedFindings = this.processToolResults(toolResults);
      analysisRun.findings = processedFindings;

      // 5.1 Generar misiones
      let missions: any[] = [];
      if (isReanalysis && previousAnalysis && analysisRun.id === previousAnalysis.id) {
        try {
          await this.updateMissionsStatus(analysisRun, toolResults);
          // Obtener misiones existentes para contar
          missions = await this.missionsService.findByAnalysisId(analysisRun.id);
        } catch (e) {
          this.logger.warn('No se pudo actualizar estado de misiones: ' + e.message);
        }
      } else {
        // 5.2 Generar misiones automáticas para análisis nuevo
        try {
          if (this.missionsService && typeof this.missionsService.createForAnalysis === 'function') {
            missions = await this.generateMissionsFromFindings(analysisRun, toolResults, this.missionsService);
          }
        } catch (e) {
          this.logger.warn('No se pudo generar misiones automáticamente: ' + e.message);
        }
      }

      // 6. Calcular métricas basadas en MISIONES (no en todos los findings)
      // Esto asegura que Problemas = Misiones
      const missionsByPriority = {
        high: missions.filter((m: any) => m.severity === 'high').length,
        medium: missions.filter((m: any) => m.severity === 'medium').length,
        low: missions.filter((m: any) => m.severity === 'low').length
      };
      
      analysisRun.totalIssues = missions.length;
      analysisRun.highSeverityIssues = missionsByPriority.high;
      analysisRun.mediumSeverityIssues = missionsByPriority.medium;
      analysisRun.lowSeverityIssues = missionsByPriority.low;
      analysisRun.qualityScore = this.calculateQualityScoreFromMissions(
        missionsByPriority.high, 
        missionsByPriority.medium, 
        missionsByPriority.low
      );

      this.logger.log(`📊 Métricas basadas en misiones: H=${missionsByPriority.high}, M=${missionsByPriority.medium}, L=${missionsByPriority.low}, Total=${missions.length}`);

      // 7. Finalizar análisis
      analysisRun.status = 'completed';
      analysisRun.completedAt = new Date();
      await this.analysisRunRepository.save(analysisRun);

      // 7.1 Verificar y desbloquear logros si el usuario está autenticado
      if (analysisRun.userId) {
        try {
          await this.achievementsService.checkAndUnlockAchievements(analysisRun.userId);
        } catch (e) {
          this.logger.warn('No se pudo verificar logros al completar análisis: ' + e.message);
        }
      }

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

  async cloneAndAnalyzeRepository(repositoryUrl: string, student: string, userId?: number): Promise<AnalysisResult> {
    let analysisRun: AnalysisRun;
    let projectPath: string;
    let clonedRepoPath: string;

    try {
      // 1. Validar que la URL sea válida
      this.logger.log(`🔍 Validando URL del repositorio: ${repositoryUrl}`);
      
      let repoName = '';
      try {
        const url = new URL(repositoryUrl);
        if (!url.hostname.includes('github.com') && !url.hostname.includes('gitlab.com') && !url.hostname.includes('bitbucket.org')) {
          throw new Error('Solo se soportan repositorios de GitHub, GitLab y Bitbucket');
        }
        
        // Extraer nombre del repositorio
        repoName = url.pathname.split('/').filter(p => p).pop()?.replace('.git', '') || 'repo';
      } catch (urlError) {
        throw new Error(`URL de repositorio inválida: ${repositoryUrl}`);
      }

      // 2. Crear registro inicial
      this.logger.log(`📝 Creando registro de análisis para repositorio: ${repoName}`);
      
      analysisRun = this.analysisRunRepository.create({
        student,
        originalFileName: `${repoName} (Repositorio)`,
        status: 'pending',
        projectPath: '',
        userId: userId || null,
      });
      analysisRun = await this.analysisRunRepository.save(analysisRun);
      
      this.logger.log(`✅ Análisis creado con ID: ${analysisRun.id}`);

      // 3. Clonar el repositorio
      this.logger.log(`⬇️  Clonando repositorio desde: ${repositoryUrl}`);
      
      try {
        clonedRepoPath = await this.fileService.cloneRepository(repositoryUrl, analysisRun.id.toString());
        this.logger.log(`✅ Repositorio clonado en: ${clonedRepoPath}`);
      } catch (cloneError) {
        throw new Error(`Error al clonar el repositorio: ${cloneError.message}. Verifica que sea un repositorio público.`);
      }

      // 4. Actualizar el path del proyecto
      projectPath = clonedRepoPath;
      analysisRun.projectPath = projectPath;
      analysisRun.status = 'processing';
      analysisRun.fileSize = 0; // No aplica para repositorios
      await this.analysisRunRepository.save(analysisRun);

      // 5. Analizar archivos del repositorio
      const fileInfo = await this.fileService.findProjectFiles(projectPath);
      analysisRun.fileStats = {
        totalFiles: fileInfo.allFiles.length,
        javaFiles: fileInfo.javaFiles.length,
        pythonFiles: fileInfo.pythonFiles.length,
        jsFiles: fileInfo.jsFiles.length,
        linesOfCode: await this.countLinesOfCode(fileInfo.allFiles),
      };

      // 6. Ejecutar herramientas de análisis
      this.logger.log(`🔧 Ejecutando herramientas de análisis...`);
      
      const toolResults = await this.toolService.runAllTools(projectPath, fileInfo);
      
      this.logger.log(`📊 Herramientas completadas. Procesando resultados...`);

      // 6. Procesar resultados y crear missions
      const missions = await this.generateMissionsFromFindings(analysisRun, toolResults, this.missionsService);

      // 7. IMPORTANTE: Los contadores de problemas = cantidad de misiones creadas
      // Esto asegura coherencia entre lo que se muestra y las misiones disponibles
      const missionsByPriority = {
        high: missions.filter((m: any) => m.severity === 'high').length,
        medium: missions.filter((m: any) => m.severity === 'medium').length,
        low: missions.filter((m: any) => m.severity === 'low').length
      };

      this.logger.log(`📊 Misiones creadas: HIGH=${missionsByPriority.high}, MEDIUM=${missionsByPriority.medium}, LOW=${missionsByPriority.low}, TOTAL=${missions.length}`);

      // Calcular quality score basado en misiones (problemas reales)
      const qualityScore = this.calculateQualityScoreFromMissions(missionsByPriority.high, missionsByPriority.medium, missionsByPriority.low);

      // 8. Actualizar análisis con resultados
      const processedFindings = this.processToolResults(toolResults);
      
      // Contar findings por herramienta para referencia
      const toolFindings: { [key: string]: number } = {};
      for (const result of toolResults) {
        toolFindings[result.tool] = result.findings?.length || 0;
      }
      
      analysisRun.status = 'completed';
      analysisRun.totalIssues = missions.length; // Total = misiones
      analysisRun.highSeverityIssues = missionsByPriority.high;
      analysisRun.mediumSeverityIssues = missionsByPriority.medium;
      analysisRun.lowSeverityIssues = missionsByPriority.low;
      analysisRun.qualityScore = qualityScore;
      analysisRun.toolResults = toolFindings;
      analysisRun.findings = processedFindings;
      analysisRun.completedAt = new Date();
      
      await this.analysisRunRepository.save(analysisRun);

      // 9. Procesar achievements
      if (analysisRun.userId) {
        await this.achievementsService.checkAndUnlockAchievements(analysisRun.userId);
      }

      this.logger.log(`✅ Análisis completado exitosamente. ID: ${analysisRun.id}, Misiones: ${missions.length}`);

      return {
        id: analysisRun.id,
        student: analysisRun.student,
        originalFileName: analysisRun.originalFileName,
        status: analysisRun.status,
        findings: processedFindings,
        totalIssues: analysisRun.totalIssues,
        highSeverityIssues: analysisRun.highSeverityIssues,
        mediumSeverityIssues: analysisRun.mediumSeverityIssues,
        lowSeverityIssues: analysisRun.lowSeverityIssues,
        qualityScore: analysisRun.qualityScore,
        createdAt: analysisRun.createdAt.toISOString(),
        completedAt: analysisRun.completedAt?.toISOString(),
        message: `Repositorio ${repoName} analizado correctamente`
      };

    } catch (error) {
      this.logger.error(`❌ Error en análisis de repositorio: ${error.message}`, error.stack);

      if (analysisRun) {
        analysisRun.status = 'failed';
        analysisRun.errorMessage = error.message;
        await this.analysisRunRepository.save(analysisRun);
      }

      // Limpiar en caso de error
      if (projectPath) {
        await this.fileService.cleanupProject(projectPath);
      }

      throw new Error(`Error al analizar el repositorio: ${error.message}`);
    }
  }

  private calculateQualityScore(issueCount: number): number {
    // Calcular score de calidad (0-100) basado en número de problemas
    let qualityScore = 100;
    if (issueCount > 0) {
      // Penalizar por cada problema encontrado
      qualityScore = Math.max(0, 100 - (issueCount * 2));
    }
    return Math.round(qualityScore * 100) / 100;
  }

  /**
   * Calcula el score de calidad basado en las misiones (problemas reales filtrados)
   * La escala es 0-100 donde:
   * - HIGH issues penalizan más (-5 por cada uno)
   * - MEDIUM issues penalizan moderadamente (-2 por cada uno)
   * - LOW issues penalizan poco (-0.5 por cada uno)
   */
  private calculateQualityScoreFromMissions(high: number, medium: number, low: number): number {
    let score = 100;
    score -= high * 5;      // Cada problema crítico resta 5 puntos
    score -= medium * 2;    // Cada problema medio resta 2 puntos
    score -= low * 0.5;     // Cada problema leve resta 0.5 puntos
    
    // Limitar entre 0 y 100
    score = Math.max(0, Math.min(100, score));
    return Math.round(score * 10) / 10; // Redondear a 1 decimal
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
      deduplicationMap: {}, // Maps findings to tools that detected them
    };

    // Crear un mapa para deduplicación de hallazgos idénticos entre herramientas
    const findingsMap = new Map<string, { finding: any; tools: Set<string> }>();

    for (const result of toolResults) {
      processed.results[result.tool] = {
        success: result.success,
        findingsCount: result.findings.length,
        findings: result.findings,
        error: result.error,
      };

      // Generar keys para deduplicación (path + line + message)
      if (Array.isArray(result.findings)) {
        for (const finding of result.findings) {
          const filePath = finding.path || finding.file || finding.sourcefile || finding.fileName || '';
          const line = finding.line || finding.start?.line || finding.startLine || '';
          const message = (finding.message || finding.rule || finding.type || '').substring(0, 100);
          const key = `${filePath}:${line}:${message}`;

          if (findingsMap.has(key)) {
            findingsMap.get(key)!.tools.add(result.tool);
          } else {
            findingsMap.set(key, { finding, tools: new Set([result.tool]) });
          }
        }
      }
    }

    // Guardar el mapa de deduplicación para referencia
    processed.deduplicationMap = Array.from(findingsMap.entries()).reduce((acc, [key, val]) => {
      acc[key] = Array.from(val.tools);
      return acc;
    }, {});

    return processed;
  }

  /**
   * Generar misiones (missions) a partir de los findings procesados.
   * Las misiones se crean con severidad derivada de la clasificación interna.
   */
  /**
   * Genera una descripción educativa y amigable para principiantes basada en el error detectado
   */
  private generateEducationalDescription(tool: string, finding: any, severity: string): { title: string; description: string } {
    const originalMessage = finding.message || finding.description || finding.rule || finding.type || finding.check_id || 'Problema detectado';
    const ruleId = finding.ruleId || finding.rule || finding.type || finding.check_id || finding.$?.type || '';
    const msgLower = (originalMessage + ' ' + ruleId).toLowerCase();
    
    let title = '';
    let explanation = '';
    let recommendation = '';
    
    // ========== SPOTBUGS ESPECÍFICOS ==========
    if (msgLower.includes('ei_expose_rep') || msgLower.includes('expose_rep')) {
      title = '🔓 Expones datos internos de tu clase';
      explanation = 'Tu método getter retorna directamente un objeto mutable (como List o Date). Quien lo reciba puede modificar los datos internos de tu clase sin que te des cuenta.';
      recommendation = 'Retorna una copia: return new ArrayList<>(this.lista); o return new Date(this.fecha.getTime());';
    } else if (msgLower.includes('ms_should_be_final') || msgLower.includes('should_be_final')) {
      title = '🔒 Variable estática debería ser final';
      explanation = 'Las variables static que no cambian deberían ser final. Esto previene modificaciones accidentales y mejora el rendimiento.';
      recommendation = 'Cambia: static String NOMBRE = "valor"; a: static final String NOMBRE = "valor";';
    } else if (msgLower.includes('dls_dead_local_store') || msgLower.includes('dead_local')) {
      title = '🧹 Variable asignada pero nunca usada';
      explanation = 'Guardaste un valor en una variable pero luego nunca la usaste. Esto confunde a otros programadores.';
      recommendation = 'Elimina la variable o úsala. Si es para debugging, comenta por qué está ahí.';
    } else if (msgLower.includes('nm_method_naming') || msgLower.includes('method_naming')) {
      title = '📝 Nombre de método no sigue convención';
      explanation = 'En Java, los métodos usan camelCase: calcularTotal(), obtenerUsuario(). Esto hace el código más legible.';
      recommendation = 'Renombra el método siguiendo camelCase. Ejemplo: GetUser → getUser';
    } else if (msgLower.includes('se_bad_field') || msgLower.includes('serializable')) {
      title = '⚠️ Campo no serializable en clase Serializable';
      explanation = 'Tu clase implementa Serializable pero tiene campos que no se pueden serializar. Esto causará errores al guardar/enviar objetos.';
      recommendation = 'Marca el campo como transient si no necesitas guardarlo, o haz que el tipo del campo también sea Serializable.';
    } else if (msgLower.includes('urv_') || msgLower.includes('return_value_ignored')) {
      title = '⚠️ Ignorando valor de retorno importante';
      explanation = 'Llamaste a un método que retorna algo importante (como un nuevo objeto) pero no guardaste el resultado.';
      recommendation = 'String en Java es inmutable. str.trim() NO modifica str, retorna uno nuevo. Usa: str = str.trim();';
    } else if (msgLower.includes('bc_unconfirmed_cast') || msgLower.includes('unconfirmed_cast')) {
      title = '⚠️ Cast sin verificar el tipo';
      explanation = 'Estás haciendo cast a un tipo sin verificar primero. Si el objeto es de otro tipo, tu programa crasheará.';
      recommendation = 'Verifica primero: if (obj instanceof MiClase) { MiClase mc = (MiClase) obj; }';
    } else if (msgLower.includes('np_null') || msgLower.includes('null_dereference')) {
      title = '🔴 Posible NullPointerException';
      explanation = 'Estás usando una variable que podría ser null. Si es null, tu programa crasheará.';
      recommendation = 'Verifica antes de usar: if (variable != null) { variable.hacerAlgo(); }';
    } else if (msgLower.includes('os_open_stream') || msgLower.includes('open_stream')) {
      title = '🔴 Stream abierto sin cerrar';
      explanation = 'Abriste un archivo/conexión pero no lo cierras. Esto causa memory leaks y puede bloquear archivos.';
      recommendation = 'Usa try-with-resources: try (InputStream is = new FileInputStream(f)) { ... }';
    } else if (msgLower.includes('sql_nonconstant') || msgLower.includes('sql_prepared')) {
      title = '🔴 SQL con concatenación de strings';
      explanation = 'Concatenar strings para SQL es peligroso. Un atacante puede inyectar código SQL malicioso.';
      recommendation = 'Usa PreparedStatement: ps.setString(1, nombre); NUNCA: "SELECT * FROM users WHERE name=\'" + nombre + "\'"';
    } else if (msgLower.includes('pzla_') || msgLower.includes('prefer_zero_length_arrays')) {
      title = '💡 Retorna array vacío en lugar de null';
      explanation = 'Retornar null obliga a quien llama a verificar. Es más seguro retornar un array/lista vacío.';
      recommendation = 'En lugar de return null; usa return new String[0]; o return Collections.emptyList();';
    }
    // ========== PMD Y GENERALES ==========
    else if (msgLower.includes('system.out') || msgLower.includes('system.err') || msgLower.includes('println')) {
      title = '📝 No uses System.out.println() en código profesional';
      explanation = 'System.out.println() está bien para aprender, pero en código real debes usar un Logger.';
      recommendation = 'Usa logger.info("Mi mensaje") en lugar de System.out.println("Mi mensaje")';
    } else if (msgLower.includes('string') && (msgLower.includes('instantiat') || msgLower.includes('new string'))) {
      title = '⚡ No crees String con new String()';
      explanation = 'En Java, crear strings con new String() desperdicia memoria innecesariamente.';
      recommendation = 'Usa: String texto = "Hola"; en lugar de String texto = new String("Hola");';
    } else if (msgLower.includes('hardcoded') || msgLower.includes('credential') || msgLower.includes('password') || (msgLower.includes('api') && msgLower.includes('key'))) {
      title = '🔴 ¡ALERTA! Contraseñas en el código';
      explanation = 'Nunca escribas contraseñas o claves en el código. Si subes a GitHub, cualquiera lo verá.';
      recommendation = 'Usa variables de entorno: String password = System.getenv("DB_PASSWORD");';
    } else if (msgLower.includes('sql') && (msgLower.includes('inject') || msgLower.includes('injection'))) {
      title = '🔴 SQL Injection - Vulnerabilidad crítica';
      explanation = 'Si concatenas input del usuario en SQL, un atacante puede ejecutar comandos maliciosos.';
      recommendation = 'Usa PreparedStatement: stmt.setString(1, email); en lugar de concatenar strings';
    } else if (msgLower.includes('resource') || msgLower.includes('close') || msgLower.includes('leak') || msgLower.includes('stream')) {
      title = '📚 Recurso sin cerrar correctamente';
      explanation = 'Archivos y conexiones abiertos sin cerrar causan memory leaks y ralentizan el programa.';
      recommendation = 'Usa try-with-resources: try (FileReader fr = new FileReader("archivo.txt")) { ... }';
    } else if (msgLower.includes('null') || msgLower.includes('npe') || msgLower.includes('pointer')) {
      title = '⚠️ Variable puede ser null - causará crash';
      explanation = 'Si usas una variable null sin verificar, el programa se detendrá con NullPointerException.';
      recommendation = 'Siempre verifica: if (variable != null) { variable.usar(); }';
    } else if (msgLower.includes('emptycatch') || msgLower.includes('empty catch')) {
      title = '🚨 Catch vacío - ¡Los errores se pierden!';
      explanation = 'Si haces catch {} sin código, los errores ocurren en silencio y no sabrás por qué falla tu app.';
      recommendation = 'Mínimo loguea: catch (Exception e) { logger.error("Error: ", e); }';
    } else if (msgLower.includes('avoidprintstacktrace') || msgLower.includes('printstacktrace')) {
      title = '📝 Usa Logger en vez de printStackTrace()';
      explanation = 'printStackTrace() imprime a consola que no siempre es visible. Los logs profesionales van a archivos.';
      recommendation = 'Usa: logger.error("Mensaje descriptivo", excepcion);';
    } else if (msgLower.includes('unusedlocal') || msgLower.includes('unused local') || msgLower.includes('unused private')) {
      title = '🧹 Código muerto - Variable sin usar';
      explanation = 'Tienes código que no se usa. Esto confunde y hace el programa más difícil de entender.';
      recommendation = 'Elimina variables y métodos que no uses. Mantén el código limpio.';
    } else if (msgLower.includes('localvariablecouldbefinal') || msgLower.includes('could be final')) {
      title = '💡 Variable podría ser final';
      explanation = 'Si una variable no cambia después de asignarla, declárala como final. Previene bugs.';
      recommendation = 'Cambia: String nombre = "Juan"; a: final String nombre = "Juan";';
    } else if (msgLower.includes('shortvariable') || msgLower.includes('short variable') || msgLower.includes('avoid variables with short names')) {
      title = '📝 Nombre de variable muy corto';
      explanation = 'Variables como "x", "i1", "s" son difíciles de entender. Los nombres descriptivos hacen el código legible.';
      recommendation = 'Usa nombres que expliquen qué contienen: contador, nombreUsuario, precioTotal';
    } else if (msgLower.includes('atleastoneconstructor') || msgLower.includes('at least one constructor')) {
      title = '💡 Clase sin constructor explícito';
      explanation = 'Es buena práctica tener al menos un constructor, aunque sea el default, para claridad.';
      recommendation = 'Agrega: public MiClase() { } o un constructor con parámetros que necesites.';
    } else if (msgLower.includes('methodargumentcouldbefinal') || msgLower.includes('parameter') && msgLower.includes('final')) {
      title = '💡 Parámetro podría ser final';
      explanation = 'Si no modificas un parámetro dentro del método, declararlo final previene errores accidentales.';
      recommendation = 'Cambia: void metodo(String nombre) a: void metodo(final String nombre)';
    } else if (msgLower.includes('controlstatementbraces') || msgLower.includes('should have braces')) {
      title = '⚠️ If/else sin llaves - peligroso';
      explanation = 'Escribir if sin { } es peligroso. Si agregas una línea después, no estará dentro del if.';
      recommendation = 'Siempre usa llaves: if (condicion) { accion(); } aunque sea una sola línea.';
    } else if (msgLower.includes('integrity') || msgLower.includes('missing-integrity')) {
      title = '🔒 Recurso externo sin verificación de integridad';
      explanation = 'Los scripts/estilos externos deben tener atributo "integrity" para prevenir ataques.';
      recommendation = 'Agrega integrity="sha384-..." y crossorigin="anonymous" a tus tags <script> y <link>';
    } else if (msgLower.includes('xss') || (msgLower.includes('script') && msgLower.includes('user'))) {
      title = '🔴 XSS - Input del usuario no validado';
      explanation = 'Si muestras texto del usuario en HTML sin validar, un atacante inyecta scripts maliciosos.';
      recommendation = 'Escapa el HTML del usuario antes de mostrarlo.';
    }

    const severityEmoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    
    if (title) {
      let description = '### ¿Qué está pasando?\n\n' + explanation + '\n\n### ¿Cómo arreglarlo?\n\n' + recommendation;
      description += '\n\n---\n\n**🔧 Herramienta:** ' + tool + '\n\n**📋 Mensaje técnico:** ' + originalMessage;
      
      return {
        title: severityEmoji + ' ' + title,
        description
      };
    }

    let genericExplanation = severity === 'high' 
      ? 'Este es un problema importante que debes corregir. Puede causar errores graves o vulnerabilidades de seguridad.'
      : severity === 'medium'
      ? 'Este es un problema a revisar. Mejorará la calidad y mantenibilidad de tu código.'
      : 'Esta es una sugerencia de mejora. Tu código será más limpio y profesional.';
      
    return {
      title: severityEmoji + ' Mejora tu código: ' + originalMessage.substring(0, 80) + (originalMessage.length > 80 ? '...' : ''),
      description: '### ¿Qué está pasando?\n\n' + genericExplanation + '\n\n### Mensaje del análisis\n\n' + originalMessage + '\n\n---\n\n**🔧 Herramienta:** ' + tool
    };
  }

  async generateMissionsFromFindings(analysis: AnalysisRun, toolResults: ToolResult[], missionsService: any): Promise<any[]> {
    // Normalizar todos los findings en una lista plana
    const allFindings: any[] = [];
    
    this.logger.log(`📊 [generateMissionsFromFindings] Procesando ${toolResults.length} herramientas`);
    
    for (const tr of toolResults) {
      if (!tr || !tr.findings) {
        this.logger.log(`⚠️ [${tr?.tool || 'unknown'}] Sin findings`);
        continue;
      }
      
      const findingsCount = Array.isArray(tr.findings) ? tr.findings.length : 'objeto';
      this.logger.log(`📖 [${tr.tool}] Procesando ${findingsCount} findings`);
      
      if (Array.isArray(tr.findings)) {
        for (const f of tr.findings) {
          allFindings.push({ tool: tr.tool, raw: f });
          // Log más detallado para Semgrep
          if (tr.tool === 'semgrep') {
            this.logger.log(`  └─ SEMGREP: check_id=${f.check_id}, severity=${f.severity}, msg=${(f.message || '').substring(0, 50)}`);
          }
        }
      } else if (typeof tr.findings === 'object') {
        // Try to extract nested 'results' structure
        const res = (tr.findings as any).results || tr.findings;
        if (res && typeof res === 'object') {
          for (const key of Object.keys(res || {})) {
            const item = res[key];
            const arr = item?.findings || item || [];
            if (Array.isArray(arr)) {
              for (const f of arr) {
                allFindings.push({ tool: tr.tool, raw: f });
                this.logger.debug(`  └─ ${tr.tool}[${key}]: ${f.message || f.rule || f.title || 'sin descripción'}`);
              }
            }
          }
        }
      }
    }

    this.logger.log(`✅ Total findings procesados: ${allFindings.length}`);

    const missionsToCreate: Partial<any>[] = [];

    for (const f of allFindings) {
      // Determinar severidad
      const severity = this.determineSeverity(f.tool, f.raw);
      
      // Generar título y descripción educativa
      const educational = this.generateEducationalDescription(f.tool, f.raw, severity);
      
      // Construir ubicación del problema
      const filePath = f.raw.path || f.raw.sourceLine?.sourcefile || f.raw.sourcefile || f.raw.fileName || f.raw.file || null;
      const startLine = f.raw.start?.line || f.raw.sourceLine?.beginline || f.raw.sourceLine?.start || f.raw.line || null;
      const endLine = f.raw.end?.line || f.raw.sourceLine?.endline || f.raw.sourceLine?.end || null;

      // Intentar leer la línea de código del archivo
      let codeSnippet = null;
      if (filePath && startLine) {
        try {
          const fs = require('fs');
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const lineIndex = Number(startLine) - 1;
            if (lineIndex >= 0 && lineIndex < lines.length) {
              codeSnippet = lines[lineIndex].trim();
            }
          }
        } catch (err) {
          // Silenciosamente ignorar si no se puede leer el archivo
        }
      }

      this.logger.log(`🎯 [${f.tool}] ${severity.toUpperCase()}: ${educational.title} @ ${filePath}:${startLine}`);

      missionsToCreate.push({
        title: educational.title,
        description: educational.description,
        filePath,
        lineStart: startLine ? Number(startLine) : null,
        lineEnd: endLine ? Number(endLine) : null,
        severity,
        codeSnippet,
        metadata: { tool: f.tool, raw: f.raw }
      });
    }

    this.logger.log(`📋 Total misiones sin filtrar: ${missionsToCreate.length}`);

    // Contar por herramienta para debug
    const countByTool: Record<string, number> = {};
    for (const m of missionsToCreate) {
      const tool = m.metadata?.tool || 'unknown';
      countByTool[tool] = (countByTool[tool] || 0) + 1;
    }
    this.logger.log(`📊 Misiones por herramienta: ${JSON.stringify(countByTool)}`);

    // ========== AGRUPAR MISIONES SIMILARES ==========
    // Agrupar por: title + herramienta (para no mostrar 10 veces "System.out.println")
    const groupedMissions = new Map<string, { mission: typeof missionsToCreate[0]; count: number; files: Set<string> }>();
    
    for (const m of missionsToCreate) {
      // Crear clave de agrupación: título base (sin emojis de severidad) + herramienta
      const baseTitle = (m.title || '').replace(/^[🔴🟡🟢⚠️💡🔓🔒🧹📝⚡📚🚨🔍📁📋🎯✅]\s*/g, '').trim();
      const tool = m.metadata?.tool || 'unknown';
      const groupKey = `${tool}::${baseTitle}`;
      
      const existing = groupedMissions.get(groupKey);
      if (existing) {
        existing.count++;
        if (m.filePath) existing.files.add(m.filePath);
      } else {
        const files = new Set<string>();
        if (m.filePath) files.add(m.filePath);
        groupedMissions.set(groupKey, { mission: m, count: 1, files });
      }
    }

    // Convertir grupos a misiones con conteo en el título
    const consolidatedMissions: typeof missionsToCreate = [];
    for (const [_, group] of groupedMissions) {
      const m = { ...group.mission };
      if (group.count > 1) {
        // Agregar conteo al título
        const filesCount = group.files.size;
        const countSuffix = filesCount > 1 
          ? ` (${group.count}x en ${filesCount} archivos)`
          : ` (${group.count} veces)`;
        m.title = m.title + countSuffix;
        
        // Agregar info adicional en descripción
        m.description = m.description + `\n\n---\n\n**📊 Encontrado ${group.count} veces** en ${filesCount} archivo(s):\n${Array.from(group.files).slice(0, 5).map(f => `- ${f.split('/').pop() || f.split('\\').pop()}`).join('\n')}${filesCount > 5 ? `\n- ... y ${filesCount - 5} más` : ''}`;
      }
      consolidatedMissions.push(m);
    }

    this.logger.log(`📦 Misiones agrupadas: ${missionsToCreate.length} → ${consolidatedMissions.length}`);

    // FILTRAR: Priorizar HIGH y MEDIUM, limitar LOW
    // Ordenar por severidad: high primero, luego medium, luego low
    const sortedMissions = consolidatedMissions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });

    // Separar por severidad
    const highMissions = sortedMissions.filter(m => m.severity === 'high');
    const mediumMissions = sortedMissions.filter(m => m.severity === 'medium');
    const lowMissions = sortedMissions.filter(m => m.severity === 'low');

    // Contar Semgrep en cada categoría
    const semgrepHigh = highMissions.filter(m => m.metadata?.tool === 'semgrep').length;
    const semgrepMedium = mediumMissions.filter(m => m.metadata?.tool === 'semgrep').length;
    const semgrepLow = lowMissions.filter(m => m.metadata?.tool === 'semgrep').length;
    this.logger.log(`📊 Semgrep: HIGH=${semgrepHigh}, MEDIUM=${semgrepMedium}, LOW=${semgrepLow}`);

    this.logger.log(`📊 Distribución total: HIGH=${highMissions.length}, MEDIUM=${mediumMissions.length}, LOW=${lowMissions.length}`);

    // Estrategia: Incluir todas las HIGH, hasta 50 MEDIUM, y hasta 20 LOW (máximo 100 total)
    const maxTotal = 100;
    const maxMedium = 50;
    const maxLow = 20;

    let selected: typeof missionsToCreate = [];
    selected.push(...highMissions); // Todas las HIGH
    
    const remainingAfterHigh = maxTotal - selected.length;
    if (remainingAfterHigh > 0) {
      selected.push(...mediumMissions.slice(0, Math.min(maxMedium, remainingAfterHigh)));
    }
    
    const remainingAfterMedium = maxTotal - selected.length;
    if (remainingAfterMedium > 0) {
      selected.push(...lowMissions.slice(0, Math.min(maxLow, remainingAfterMedium)));
    }

    this.logger.log(`🎯 Misiones seleccionadas: ${selected.length} (H:${highMissions.length}, M:${Math.min(mediumMissions.length, maxMedium)}, L:${Math.min(lowMissions.length, maxLow)})`);

    // Crear misiones usando el servicio pasado
    const created = await missionsService.createForAnalysis(analysis, selected);

    this.logger.log(`✅ Misiones creadas: ${created.length}`);

    // Mapear las misiones recién creadas a los findings procesados dentro del objeto `analysis`
    try {
      if (analysis && analysis.findings && analysis.findings.results) {
        for (const cm of created) {
          try {
            const tool = cm.metadata?.tool;
            const rawMeta = cm.metadata?.raw || {};
            const resultsForTool = analysis.findings.results[tool];
            if (!resultsForTool) continue;
            const arr = Array.isArray(resultsForTool.findings) ? resultsForTool.findings : [];

            // Buscar un finding que coincida razonablemente con la misión creada
            const matchIndex = arr.findIndex((f: any) => {
              try {
                const pathCandidates = [f.path, f.file, f.sourcefile, f.fileName, f.filename, f['$']?.sourcefile, f.sourceLine?.sourcefile];
                const fpath = pathCandidates.find((p: any) => p != null);
                const missionPath = cm.filePath || rawMeta.path || rawMeta.file || rawMeta.sourcefile || null;

                // Comparar path si existe
                if (missionPath && fpath) {
                  const equalPath = ('' + fpath).endsWith('' + missionPath) || ('' + fpath) === ('' + missionPath);
                  if (!equalPath) return false;
                }

                // Comparar líneas si existen
                const fstart = f.line || f.start?.line || f.sourceLine?.beginline || f.startLine || f.$?.start || null;
                const mstart = cm.lineStart || rawMeta.start || rawMeta.startLine || null;
                if (mstart && fstart) {
                  if (Number(fstart) !== Number(mstart)) return false;
                }

                // Comparar mensaje/descr
                const fmsg = (f.message || f.description || f.rule || '').toString();
                const mmsg = (rawMeta.message || rawMeta.rule || cm.title || '').toString();
                if (mmsg && fmsg) {
                  if (!fmsg.includes(mmsg) && !mmsg.includes(fmsg)) {
                    // Si no coinciden por mensaje, aún así podríamos aceptar si path/line coinciden
                    // permitimos caída aquí
                  }
                }

                return true;
              } catch (err) {
                return false;
              }
            });

            if (matchIndex >= 0) {
              // Marcar el finding con la referencia a la misión
              arr[matchIndex]._missionId = cm.id;
              arr[matchIndex].missionId = cm.id;
            }
          } catch (err) {
            // ignorar errores individuales de mapeo
            this.logger.warn('Error mapeando misión a finding: ' + err.message);
          }
        }

        // Guardar cambios en el registro de análisis para que el frontend pueda ver la relación
        try {
          await this.analysisRunRepository.save(analysis);
        } catch (err) {
          this.logger.warn('No se pudo persistir mapping misiones-findings: ' + err.message);
        }
      }
    } catch (err) {
      this.logger.warn('Error durante el mapeo de misiones a findings: ' + err.message);
    }

    return created;
  }

  /**
   * Compara la estructura de dos proyectos para determinar si son el mismo
   * Retorna true si la similitud es >= 70%
   */
  private compareProjectStructure(
    oldFileStats: any,
    newFileStats: any,
    newFileInfo: any
  ): boolean {
    if (!oldFileStats || !newFileStats) {
      return false;
    }

    // Criterio 1: Comparar cantidad de archivos por tipo (tolerancia de ±30%)
    const types = ['javaFiles', 'pythonFiles', 'jsFiles'];
    let typeMatchCount = 0;
    
    for (const type of types) {
      const oldCount = oldFileStats[type] || 0;
      const newCount = newFileStats[type] || 0;
      
      if (oldCount === 0 && newCount === 0) {
        typeMatchCount++;
        continue;
      }
      
      if (oldCount === 0 || newCount === 0) {
        continue; // No coincide si uno tiene archivos y el otro no
      }
      
      const ratio = Math.min(oldCount, newCount) / Math.max(oldCount, newCount);
      if (ratio >= 0.7) { // 70% de similitud en cantidad
        typeMatchCount++;
      }
    }

    // Criterio 2: Comparar total de archivos (tolerancia de ±30%)
    const oldTotal = oldFileStats.totalFiles || 0;
    const newTotal = newFileStats.totalFiles || 0;
    const totalRatio = oldTotal > 0 && newTotal > 0 
      ? Math.min(oldTotal, newTotal) / Math.max(oldTotal, newTotal)
      : 0;

    // Criterio 3: Comparar líneas de código (tolerancia de ±40%)
    const oldLoc = oldFileStats.linesOfCode || 0;
    const newLoc = newFileStats.linesOfCode || 0;
    const locRatio = oldLoc > 0 && newLoc > 0
      ? Math.min(oldLoc, newLoc) / Math.max(oldLoc, newLoc)
      : 0;

    // Decisión: consideramos mismo proyecto si:
    // - Al menos 2 de 3 tipos de archivos coinciden en cantidad (70% similitud)
    // - Y el total de archivos es similar (70% similitud)
    // - O las líneas de código son similares (60% similitud)
    
    const isSimilarByTypes = typeMatchCount >= 2;
    const isSimilarByTotal = totalRatio >= 0.7;
    const isSimilarByLoc = locRatio >= 0.6;

    const isSameProject = (isSimilarByTypes && isSimilarByTotal) || 
                          (isSimilarByTypes && isSimilarByLoc) ||
                          (isSimilarByTotal && isSimilarByLoc && totalRatio >= 0.8);

    console.log('=== Project Structure Comparison ===');
    console.log('Old stats:', oldFileStats);
    console.log('New stats:', newFileStats);
    console.log('Type matches:', typeMatchCount, '/3');
    console.log('Total ratio:', totalRatio.toFixed(2));
    console.log('LOC ratio:', locRatio.toFixed(2));
    console.log('Is same project:', isSameProject);

    return isSameProject;
  }

  /**
   * Actualiza el estado de las misiones existentes comparando con los nuevos findings
   */
  private async updateMissionsStatus(
    analysis: AnalysisRun,
    newToolResults: ToolResult[]
  ): Promise<void> {
    if (!this.missionsService) {
      this.logger.warn('MissionsService no disponible para actualizar estado de misiones');
      return;
    }

    // Obtener misiones existentes de este análisis
    const missions = await this.missionsService.findByAnalysisId(analysis.id);
    
    if (!missions || missions.length === 0) {
      this.logger.log('No hay misiones existentes para actualizar');
      return;
    }

    this.logger.log(`Actualizando estado de ${missions.length} misiones existentes`);

    // Extraer todos los findings del nuevo análisis
    const newFindings = this.extractAllFindings(newToolResults);

    let fixedCount = 0;
    let stillPendingCount = 0;

    for (const mission of missions) {
      // Saltar misiones ya marcadas como fixed o skipped
      if (mission.status === 'fixed' || mission.status === 'skipped') {
        continue;
      }

      // Verificar si el problema de esta misión aún existe en los nuevos findings
      const stillExists = this.findingStillExists(mission, newFindings);

      if (!stillExists) {
        // El problema fue corregido
        await this.missionsService.markFixed(mission.id);
        fixedCount++;
        this.logger.log(`Misión ${mission.id} marcada como corregida (problema no encontrado en re-análisis)`);
      } else {
        stillPendingCount++;
      }
    }

    this.logger.log(`Misiones actualizadas: ${fixedCount} corregidas, ${stillPendingCount} aún pendientes`);
  }

  /**
   * Extrae todos los findings de los resultados de herramientas en un formato normalizado
   */
  private extractAllFindings(toolResults: ToolResult[]): any[] {
    const allFindings: any[] = [];
    
    for (const tr of toolResults) {
      if (!tr || !tr.findings) continue;
      
      if (Array.isArray(tr.findings)) {
        for (const f of tr.findings) {
          allFindings.push({ tool: tr.tool, finding: f });
        }
      } else if (typeof tr.findings === 'object') {
        const res = (tr.findings as any).results || tr.findings;
        if (res && typeof res === 'object') {
          for (const key of Object.keys(res || {})) {
            const item = res[key];
            const arr = item?.findings || item || [];
            if (Array.isArray(arr)) {
              for (const f of arr) {
                allFindings.push({ tool: tr.tool, finding: f });
              }
            }
          }
        }
      }
    }
    
    return allFindings;
  }

  /**
   * Verifica si un finding similar a una misión aún existe
   */
  private findingStillExists(mission: any, newFindings: any[]): boolean {
    const missionMeta = mission.metadata?.raw || {};
    const missionTool = mission.metadata?.tool;

    for (const { tool, finding } of newFindings) {
      // Debe ser de la misma herramienta
      if (tool !== missionTool) {
        continue;
      }

      // Comparar ubicación (archivo y línea)
      const findingPath = finding.path || finding.file || finding.sourcefile || finding.fileName || 
                         finding.sourceLine?.sourcefile || '';
      const missionPath = mission.filePath || missionMeta.path || missionMeta.file || '';

      if (missionPath && findingPath) {
        const pathsMatch = findingPath.includes(missionPath) || missionPath.includes(findingPath);
        
        if (pathsMatch) {
          // Comparar línea
          const findingLine = finding.line || finding.start?.line || finding.sourceLine?.beginline || 
                             finding.startLine || null;
          const missionLine = mission.lineStart || missionMeta.line || missionMeta.startLine || null;

          if (findingLine && missionLine && Math.abs(Number(findingLine) - Number(missionLine)) <= 2) {
            // Mismo archivo y línea similar (±2 líneas de tolerancia)
            // Comparar mensaje/regla
            const findingMsg = (finding.message || finding.rule || finding.type || finding.check_id || '').toString();
            const missionMsg = (missionMeta.message || missionMeta.rule || missionMeta.type || '').toString();

            if (findingMsg && missionMsg && (
              findingMsg.includes(missionMsg) || 
              missionMsg.includes(findingMsg) ||
              findingMsg === missionMsg
            )) {
              return true; // El finding aún existe
            }
          }
        }
      }
    }

    return false; // No se encontró un finding similar
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
    return this.determineSeverityFromFinding(tool, finding);
  }

  /**
   * Determina la severidad de un finding basado en la herramienta y sus propiedades
   * PMD: priority 1-2 = high, 3 = medium, 4-5 = low
   * SpotBugs: priority 1 = high, 2 = medium, 3+ = low
   */
  private determineSeverityFromFinding(tool: string, finding: any): 'high' | 'medium' | 'low' {
    try {
      switch (tool) {
        case 'spotbugs':
          // Manejar tanto formato XML como formato de demostración
          const sbPriority = finding.$?.priority || finding.priority;
          const sbPriorityNum = typeof sbPriority === 'number' ? sbPriority : parseInt(sbPriority) || 3;
          if (sbPriorityNum <= 1) return 'high';
          if (sbPriorityNum === 2) return 'medium';
          return 'low';
          
        case 'pmd':
          // PMD usa priority 1-5: 1=crítico, 2=alto, 3=medio, 4=bajo, 5=info
          const pmdPriority = finding.priority || finding.$.priority;
          const pmdPriorityNum = typeof pmdPriority === 'number' ? pmdPriority : parseInt(pmdPriority) || 5;
          if (pmdPriorityNum <= 2) return 'high';  // priority 1-2 = high
          if (pmdPriorityNum === 3) return 'medium'; // priority 3 = medium
          return 'low'; // priority 4-5 = low
          
        case 'semgrep':
          // Para Semgrep, usar severity - valores: ERROR, WARNING, INFO
          const semgrepSev = (finding.severity || finding.extra?.severity || '').toString().toUpperCase();
          this.logger.debug(`[Semgrep] Raw severity: ${semgrepSev}, check_id: ${finding.check_id}`);
          if (semgrepSev === 'ERROR' || semgrepSev === 'HIGH') return 'high';
          if (semgrepSev === 'WARNING' || semgrepSev === 'MEDIUM') return 'medium';
          return 'low';
          
        case 'eslint':
          const eslintSeverity = finding.severity;
          if (eslintSeverity === 2) return 'high';
          if (eslintSeverity === 1) return 'medium';
          return 'low';

        case 'direct-detection':
          // Para detección directa, usar el severity si está disponible
          const directSeverity = (finding.severity || '').toString().toLowerCase();
          if (directSeverity === 'high' || directSeverity === 'critical') return 'high';
          if (directSeverity === 'medium' || directSeverity === 'warning') return 'medium';
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

    // DEBUG: Log findings structure
    this.logger.log(`[findById] ID: ${id}`);
    this.logger.log(`[findById] findings type: ${typeof analysis.findings}`);
    this.logger.log(`[findById] findings value: ${JSON.stringify(analysis.findings).substring(0, 200)}`);
    
    // Si findings es string, parsearlo
    if (typeof analysis.findings === 'string') {
      try {
        analysis.findings = JSON.parse(analysis.findings);
        this.logger.log(`[findById] findings parsed to object`);
      } catch (e) {
        this.logger.warn(`[findById] Failed to parse findings: ${e.message}`);
      }
    }

    return analysis;
  }

  /**
   * Encontrar todos los análisis
   */
  async findAll(): Promise<AnalysisRun[]> {
    const analyses = await this.analysisRunRepository.find({
      order: { createdAt: 'DESC' }
    });
    
    // Parse findings if needed
    return analyses.map(a => {
      if (typeof a.findings === 'string') {
        try {
          a.findings = JSON.parse(a.findings);
        } catch (e) {
          this.logger.warn(`Failed to parse findings for analysis ${a.id}`);
        }
      }
      return a;
    });
  }

  /**
   * Encontrar análisis por estudiante
   */
  async findByStudent(student: string): Promise<AnalysisRun[]> {
    const analyses = await this.analysisRunRepository.find({
      where: { student },
      order: { createdAt: 'DESC' }
    });
    
    // Parse findings if needed
    return analyses.map(a => {
      if (typeof a.findings === 'string') {
        try {
          a.findings = JSON.parse(a.findings);
        } catch (e) {
          this.logger.warn(`Failed to parse findings for analysis ${a.id}`);
        }
      }
      return a;
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
    // Parse findings if it's a string
    let findings = analysis.findings;
    if (typeof findings === 'string') {
      try {
        findings = JSON.parse(findings);
      } catch (e) {
        this.logger.warn(`Failed to parse findings in mapToAnalysisResult for analysis ${analysis.id}`);
        findings = null;
      }
    }

    return {
      id: analysis.id,
      student: analysis.student,
      originalFileName: analysis.originalFileName,
      fileSize: analysis.fileSize,
      status: analysis.status,
      findings: findings,
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
  async findByUserId(userId: number, limit: number = 10, userEmail?: string, userName?: string): Promise<AnalysisResult[]> {
    // Construir condición where dinámica
    const conditions: any = {};
    const orConditions: any[] = [{ userId }];
    
    // Si el usuario tiene email, buscar también análisis con ese email como estudiante
    if (userEmail) {
      orConditions.push({ student: userEmail });
    }
    
    // Si el usuario tiene nombre, buscar también análisis con ese nombre como estudiante
    if (userName) {
      orConditions.push({ student: userName });
    }
    
    const analyses = await this.analysisRunRepository.find({
      where: orConditions.length > 1 ? orConditions : { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Deduplicar por ID en caso de duplicados
    const uniqueAnalyses = Array.from(new Map(analyses.map(a => [a.id, a])).values());
    
    return uniqueAnalyses.map(analysis => this.mapToAnalysisResult(analysis));
  }

  async getUserSummary(userId: number, userEmail?: string, userName?: string): Promise<{
    totalAnalyses: number;
    averageScore: number;
    totalIssues: number;
    highSeverityIssues: number;
    mediumSeverityIssues: number;
    lowSeverityIssues: number;
    recentAnalyses: AnalysisResult[];
  }> {
    // Buscar por userId o por email/nombre del estudiante
    const orConditions: any[] = [
      { userId }
    ];
    
    if (userEmail) {
      orConditions.push({ student: userEmail });
    }
    
    if (userName) {
      orConditions.push({ student: userName });
    }
    
    const analyses = await this.analysisRunRepository.find({
      where: orConditions.length > 1 ? orConditions : { userId },
      order: { createdAt: 'DESC' },
    });

    // Deduplicar
    const uniqueAnalyses = Array.from(new Map(analyses.map(a => [a.id, a])).values());

    const totalAnalyses = uniqueAnalyses.length;
    
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
