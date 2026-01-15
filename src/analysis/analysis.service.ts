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

      // 5.1 Si es re-análisis del mismo proyecto, actualizar estado de misiones existentes
      if (isReanalysis && previousAnalysis && analysisRun.id === previousAnalysis.id) {
        try {
          await this.updateMissionsStatus(analysisRun, toolResults);
        } catch (e) {
          this.logger.warn('No se pudo actualizar estado de misiones: ' + e.message);
        }
      } else {
        // 5.2 Generar misiones automáticas para análisis nuevo
        try {
          if (this.missionsService && typeof this.missionsService.createForAnalysis === 'function') {
            await this.generateMissionsFromFindings(analysisRun, toolResults, this.missionsService);
          }
        } catch (e) {
          this.logger.warn('No se pudo generar misiones automáticamente: ' + e.message);
        }
      }

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

      // 7. Recolectar findings
      const allFindings = [];
      const toolFindings: { [key: string]: number } = {
        'pmd': 0,
        'semgrep': 0,
        'spotbugs': 0,
        'direct-detection': 0
      };

      for (const result of toolResults) {
        if (result.findings && result.findings.length > 0) {
          // Normalizar findings añadiendo severity basada en priority/severity existente
          const normalizedFindings = result.findings.map((f: any) => {
            const severity = this.determineSeverityFromFinding(result.tool, f);
            return { ...f, severity, tool: result.tool };
          });
          allFindings.push(...normalizedFindings);
          toolFindings[result.tool] = result.findings.length;
          this.logger.log(`  ✓ ${result.tool}: ${result.findings.length} hallazgos`);
        }
      }

      // 8. Calcular métricas basadas en severity normalizada
      const highSeverity = allFindings.filter(f => f.severity === 'high').length;
      const mediumSeverity = allFindings.filter(f => f.severity === 'medium').length;
      const lowSeverity = allFindings.filter(f => f.severity === 'low').length;

      this.logger.log(`📊 Severidades calculadas: HIGH=${highSeverity}, MEDIUM=${mediumSeverity}, LOW=${lowSeverity}`);

      const qualityScore = this.calculateQualityScore(allFindings.length);

      // 9. Actualizar análisis con resultados (usar processToolResults para estructura correcta)
      const processedFindings = this.processToolResults(toolResults);
      
      analysisRun.status = 'completed';
      analysisRun.totalIssues = allFindings.length;
      analysisRun.highSeverityIssues = highSeverity;
      analysisRun.mediumSeverityIssues = mediumSeverity;
      analysisRun.lowSeverityIssues = lowSeverity;
      analysisRun.qualityScore = qualityScore;
      analysisRun.toolResults = toolFindings;
      analysisRun.findings = processedFindings; // Usar estructura correcta, no JSON.stringify
      analysisRun.completedAt = new Date();
      
      await this.analysisRunRepository.save(analysisRun);

      // 10. Procesar achievements
      if (analysisRun.userId) {
        await this.achievementsService.checkAndUnlockAchievements(analysisRun.userId);
      }

      this.logger.log(`✅ Análisis completado exitosamente. ID: ${analysisRun.id}, Hallazgos: ${allFindings.length}`);

      return {
        id: analysisRun.id,
        student: analysisRun.student,
        originalFileName: analysisRun.originalFileName,
        status: analysisRun.status,
        findings: allFindings,
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
    
    if (msgLower.includes('system.out') || msgLower.includes('system.err') || msgLower.includes('println')) {
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
    } else if (msgLower.includes('file') && (msgLower.includes('stream') || msgLower.includes('reader') || msgLower.includes('writer'))) {
      title = '📁 Manejo incorrecto de archivos';
      explanation = 'FileInputStream, FileOutputStream y streams necesitan cerrarse correctamente.';
      recommendation = 'Usa try-with-resources para cerrar automáticamente los recursos';
    } else if (msgLower.includes('xss') || (msgLower.includes('script') && msgLower.includes('user'))) {
      title = '🔴 XSS - Input del usuario no validado';
      explanation = 'Si muestras texto del usuario en HTML sin validar, un atacante inyecta scripts maliciosos.';
      recommendation = 'En JSP usa taglib o escapeador: <c:out value="${usuarioInput}"/>';
    } else if (msgLower.includes('random') && msgLower.includes('secure')) {
      title = '🔴 Random() no es seguro para tokens';
      explanation = 'Math.random() es predecible. Un atacante puede adivinar tokens o sesiones.';
      recommendation = 'Para criptografía usa: new SecureRandom().nextBytes(buffer);';
    } else if (msgLower.includes('path') && msgLower.includes('traversal')) {
      title = '🔴 Path Traversal - Acceso a archivos malicioso';
      explanation = 'Si un usuario escribe "../../../etc/passwd", accede a archivos fuera de su carpeta.';
      recommendation = 'Valida rutas: Path full = base.resolve(userPath).normalize();';
    } else if (msgLower.includes('command') && msgLower.includes('inject')) {
      title = '🔴 Command Injection - Ejecución de comandos peligrosa';
      explanation = 'Runtime.exec() con input del usuario permite atacantes ejecutar comandos arbitrarios.';
      recommendation = 'Evita Runtime.exec() con input del usuario. Si es necesario, valida muy estrictamente.';
    } else if (msgLower.includes('equal') || msgLower.includes('==') || (msgLower.includes('comparison') && msgLower.includes('string'))) {
      title = '🔍 Comparación incorrecta de objetos';
      explanation = '== compara si son el mismo objeto en memoria. Para contenido, usa .equals().';
      recommendation = 'Usa: if (usuario1.equals(usuario2)) o usuario1.equalsIgnoreCase(usuario2);';
    } else if (msgLower.includes('unused') || msgLower.includes('never read') || msgLower.includes('not used')) {
      title = '🧹 Variable declarada pero nunca usada';
      explanation = 'Mantener variables sin usar hace el código confuso y difícil de mantener.';
      recommendation = 'Si no la usas, elimínala. Otros programadores pensarán que falta algo.';
    } else if (msgLower.includes('exception') || msgLower.includes('catch') || msgLower.includes('error handling')) {
      title = '🚨 Manejo incorrecto de errores';
      explanation = 'Si haces catch sin hacer nada, ocultarás errores. Los bugs serán imposibles de encontrar.';
      recommendation = 'Siempre maneja excepciones: logger.error("Mensaje", e) o throw new RuntimeException(e);';
    } else if (msgLower.includes('performance') || msgLower.includes('inefficient') || msgLower.includes('slow')) {
      title = '⚡ Código ineficiente - mejora el rendimiento';
      explanation = 'Este código podría ser mucho más rápido usando mejores estructuras y algoritmos.';
      recommendation = 'Usa HashMap en lugar de ArrayList, evita loops anidados, carga datos una sola vez.';
    }

    const severityEmoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    
    if (title) {
      let description = '**¿Qué está pasando?**\n' + explanation + '\n\n**¿Cómo arreglarlo?**\n' + recommendation;
      description += '\n\n---\n\n**Herramienta:** ' + tool + '\n**Mensaje técnico:** ' + originalMessage;
      
      return {
        title: severityEmoji + ' ' + title,
        description
      };
    }

    let genericExplanation = severity === 'high' 
      ? 'Este es un problema importante que debes corregir. Puede causar errores graves.'
      : severity === 'medium'
      ? 'Este es un problema a revisar. Mejorará la seguridad y mantenibilidad.'
      : 'Esta es una sugerencia de mejora. Tu código será más limpio y profesional.';
      
    return {
      title: severityEmoji + ' Mejora tu código: ' + originalMessage.substring(0, 80) + (originalMessage.length > 80 ? '...' : ''),
      description: '**¿Qué está pasando?**\n' + genericExplanation + '\n\n**Mensaje del análisis:**\n' + originalMessage + '\n\n**Herramienta:** ' + tool
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
      
      this.logger.log(`📖 [${tr.tool}] Procesando ${Array.isArray(tr.findings) ? tr.findings.length : 'unknown'} findings`);
      
      if (Array.isArray(tr.findings)) {
        for (const f of tr.findings) {
          allFindings.push({ tool: tr.tool, raw: f });
          this.logger.debug(`  └─ ${tr.tool}: ${f.message || f.rule || f.title || 'sin descripción'}`);
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

    // FILTRAR: Priorizar HIGH y MEDIUM, limitar LOW
    // Ordenar por severidad: high primero, luego medium, luego low
    const sortedMissions = missionsToCreate.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });

    // Separar por severidad
    const highMissions = sortedMissions.filter(m => m.severity === 'high');
    const mediumMissions = sortedMissions.filter(m => m.severity === 'medium');
    const lowMissions = sortedMissions.filter(m => m.severity === 'low');

    this.logger.log(`📊 Distribución: HIGH=${highMissions.length}, MEDIUM=${mediumMissions.length}, LOW=${lowMissions.length}`);

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
          // Para Semgrep, usar severity
          const severity = finding.severity?.toLowerCase() || finding.extra?.severity?.toLowerCase();
          if (severity === 'error' || severity === 'high') return 'high';
          if (severity === 'warning' || severity === 'medium') return 'medium';
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
