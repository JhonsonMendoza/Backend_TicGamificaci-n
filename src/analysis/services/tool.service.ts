import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseString } from 'xml2js';

const execAsync = promisify(exec);
const parseXmlAsync = promisify(parseString);

export interface ToolResult {
  tool: string;
  success: boolean;
  findings: any[];
  findingsCount?: number;
  rawOutput?: string;
  error?: string;
}

@Injectable()
export class ToolService {
  private readonly logger = new Logger(ToolService.name);

  async runAllTools(projectDir: string, fileInfo: any): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    this.logger.log(`🚀 Iniciando análisis REAL en: ${projectDir}`);
    this.logger.log(`📊 Java: ${fileInfo.javaFiles?.length || 0}, JS: ${fileInfo.jsFiles?.length || 0}, Total: ${fileInfo.allFiles?.length || 0}`);

    // Ejecutar herramientas reales para proyectos Java
    if (fileInfo.javaFiles && fileInfo.javaFiles.length > 0) {
      // SpotBugs análisis real
      this.logger.log('🐛 Iniciando SpotBugs...');
      const spotbugsResult = await this.runSpotBugs(projectDir);
      this.logger.log(`🐛 SpotBugs completado: ${spotbugsResult.findings?.length || 0} hallazgos (success: ${spotbugsResult.success})`);
      results.push(spotbugsResult);

      // PMD análisis real
      this.logger.log('📋 Iniciando PMD...');
      const pmdResult = await this.runPMD(projectDir);
      this.logger.log(`📋 PMD completado: ${pmdResult.findings?.length || 0} hallazgos (success: ${pmdResult.success})`);
      results.push(pmdResult);
    } else {
      this.logger.warn('⚠️ No hay archivos Java detectados - omitiendo SpotBugs y PMD');
    }

    // Semgrep análisis real (multi-lenguaje)
    this.logger.log('🔍 Iniciando Semgrep...');
    const semgrepResult = await this.runSemgrep(projectDir);
    this.logger.log(`🔍 Semgrep completado: ${semgrepResult.findings?.length || 0} hallazgos (success: ${semgrepResult.success})`);
    results.push(semgrepResult);

    // DETECCIÓN DIRECTA: SIEMPRE ejecutar análisis directo para capturar vulnerabilidades adicionales
    this.logger.log('🔍 Ejecutando DETECCIÓN DIRECTA complementaria...');
    const directIssues = await this.detectCodeIssuesDirectly(projectDir);
    
    if (directIssues.length > 0) {
      this.logger.log(`🎯 Detección directa encontró ${directIssues.length} problemas adicionales`);
      
      // Agregar hallazgos de detección directa como herramienta separada (NO dentro de Semgrep)
      results.push({
        tool: 'direct-detection',
        success: true,
        findings: directIssues,
        rawOutput: `Detección Directa: ${directIssues.length} problemas encontrados por análisis de patrones`
      });
      
      this.logger.log(`✅ Agregados ${directIssues.length} problemas como resultado de "direct-detection"`);
    } else {
      this.logger.log(`⚠️ Detección directa no encontró problemas adicionales`);
    }
    
    // Contar hallazgos totales
    const totalFindings = results.reduce((sum, result) => sum + (result.findings?.length || 0), 0);
    
    if (totalFindings === 0) {
      this.logger.log('⚠️ ¡ALERTA! Ninguna herramienta encontró problemas');
    } else {
      this.logger.log(`✅ Herramientas encontraron ${totalFindings} problemas nativamente`);
    }

    // LOGGING DETALLADO DE CADA HERRAMIENTA
    this.logger.log('📊 ===== RESUMEN FINAL DE HERRAMIENTAS =====');
    for (const result of results) {
      const count = result.findings?.length || 0;
      this.logger.log(`  🔧 ${result.tool.toUpperCase()}: ${count} hallazgos (success: ${result.success})`);
      if (count > 0 && Array.isArray(result.findings)) {
        result.findings.slice(0, 3).forEach((f: any, i: number) => {
          const msg = f.message || f.description || f.rule || f.title || 'sin descripción';
          const line = f.line || f.start?.line || f.beginline || 'sin línea';
          this.logger.log(`    ${i+1}. [L${line}] ${msg.substring(0, 70)}`);
        });
        if (count > 3) {
          this.logger.log(`    ... y ${count - 3} más`);
        }
      }
    }
    this.logger.log(`📊 ===== TOTAL: ${results.length} herramientas, ${totalFindings} hallazgos =====`);

    this.logger.log(`✅ Análisis REAL completado. ${results.length} herramientas ejecutadas.`);
    return results;
  }

  private async runSpotBugs(projectDir: string): Promise<ToolResult> {
    this.logger.log('🐛 Ejecutando SpotBugs...');
    
    try {
      // Buscar pom.xml (puede estar en projectDir o en una subcarpeta)
      this.logger.log('🔍 Buscando pom.xml...');
      const pomPath = await this.findPomXml(projectDir);
      
      if (pomPath) {
        this.logger.log(`✅ pom.xml encontrado en: ${pomPath}`);
        // Usar la carpeta donde está el pom.xml
        const mavenProjectDir = path.dirname(pomPath);
        return await this.runSpotBugsWithMaven(mavenProjectDir);
      } else {
        this.logger.log('⚠️ pom.xml no encontrado');
        return await this.runSpotBugsDirectly(projectDir);
      }
    } catch (error) {
      this.logger.error('Error ejecutando SpotBugs:', error.message);
      return {
        tool: 'spotbugs',
        success: false,
        findings: [],
        error: error.message
      };
    }
  }

  private async findPomXml(startDir: string, maxDepth: number = 3, currentDepth: number = 0): Promise<string | null> {
    if (currentDepth >= maxDepth) return null;
    
    try {
      const pomPath = path.join(startDir, 'pom.xml');
      if (await this.fileExists(pomPath)) {
        return pomPath;
      }
      
      // Buscar en subcarpetas (máximo nivel de profundidad)
      const entries = await fs.readdir(startDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subPath = path.join(startDir, entry.name);
          const found = await this.findPomXml(subPath, maxDepth, currentDepth + 1);
          if (found) return found;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async runSpotBugsWithMaven(projectDir: string): Promise<ToolResult> {
    this.logger.log('📦 Proyecto Maven detectado - usando Maven para SpotBugs');
    
    try {
      // Detectar comando Maven disponible
      let mavenCmd = 'mvn';
      try {
        await execAsync('mvn --version', { timeout: 5000 });
        this.logger.log('✅ Maven encontrado como comando global');
      } catch (e) {
        this.logger.warn('⚠️ Maven no encontrado en PATH, intentando /usr/bin/mvn');
        mavenCmd = '/usr/bin/mvn';
        try {
          await execAsync('/usr/bin/mvn --version', { timeout: 5000 });
          this.logger.log('✅ Maven encontrado en /usr/bin/mvn');
        } catch (e2) {
          throw new Error('Maven no disponible en el sistema');
        }
      }

      // Paso 1: Compilar proyecto Maven
      this.logger.log('🔨 Paso 1: Compilando proyecto Maven...');
      let compilationSucceeded = false;
      try {
        const { stdout: compileStdout, stderr: compileStderr } = await execAsync(`${mavenCmd} clean compile`, { cwd: projectDir, timeout: 180000 });
        this.logger.log('✅ Compilación Maven completada');
        
        if (compileStdout.includes('BUILD SUCCESS') || !compileStderr.toLowerCase().includes('[error]')) {
          this.logger.log('✅ BUILD SUCCESS confirmado en Maven');
          compilationSucceeded = true;
        } else {
          this.logger.warn('⚠️ Compilación completada pero con posibles errores');
        }
      } catch (compileError) {
        this.logger.error(`❌ Error en compilación Maven: ${compileError.message}`);
        this.logger.warn('⚠️ La compilación falló - continuaremos con análisis directo');
      }
      
      if (!compilationSucceeded) {
        this.logger.warn('⚠️ Maven no compiló exitosamente - usando análisis directo');
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: 'Maven compilation failed - using direct detection'
        };
      }

      // Paso 2: Ejecutar SpotBugs
      this.logger.log('🔍 Paso 2: Ejecutando SpotBugs con Maven...');
      let spotbugsOutput = { stdout: '', stderr: '' };
      try {
        spotbugsOutput = await execAsync(`${mavenCmd} spotbugs:spotbugs`, { cwd: projectDir, timeout: 300000 });
        this.logger.log('✅ SpotBugs completado (XML generado)');
      } catch (spotbugsError) {
        // SpotBugs con Maven puede fallar si encuentra bugs, pero el XML se genera de todos modos
        this.logger.warn(`⚠️ Maven spotbugs returned non-zero exit: ${spotbugsError.message}`);
        this.logger.log('ℹ️ Continuando - SpotBugs puede haber generado XML a pesar del error');
        spotbugsOutput = {
          stdout: spotbugsError.stdout || '',
          stderr: spotbugsError.stderr || ''
        };
      }
      
      // Paso 2.5: Verificar que la compilación generó archivos .class
      this.logger.log('🔍 Paso 2.5: Verificando archivos compilados...');
      const targetClassesPath = path.join(projectDir, 'target', 'classes');
      try {
        const classFiles = await this.findFiles(targetClassesPath, '**/*.class');
        this.logger.log(`✅ Encontrados ${classFiles.length} archivos .class compilados`);
        if (classFiles.length === 0) {
          this.logger.warn('⚠️ No se encontraron archivos .class - la compilación puede haber fallado');
        }
      } catch (e) {
        this.logger.warn(`⚠️ No se pudo verificar archivos compilados: ${e.message}`);
      }
      
      // Paso 3: Buscar y parsear archivo XML
      this.logger.log('📂 Paso 3: Buscando archivo de resultados XML...');
      const possiblePaths = [
        path.join(projectDir, 'target', 'spotbugsXml.xml'),
        path.join(projectDir, 'target', 'spotbugs.xml'),
        path.join(projectDir, 'target', 'spotbugs-results.xml'),
        path.join(projectDir, 'target', 'site', 'spotbugs.xml')
      ];
      
      this.logger.log(`🔎 Buscando en ${possiblePaths.length} ubicaciones:`);
      possiblePaths.forEach((p, i) => this.logger.log(`   ${i+1}. ${p}`));
      
      let foundPath = null;
      for (const possiblePath of possiblePaths) {
        try {
          const exists = await this.fileExists(possiblePath);
          if (exists) {
            foundPath = possiblePath;
            this.logger.log(`✅ Archivo encontrado: ${foundPath}`);
            break;
          } else {
            this.logger.debug(`   ❌ No existe: ${possiblePath}`);
          }
        } catch (checkError) {
          this.logger.debug(`   ⚠️ Error verificando ${possiblePath}: ${checkError.message}`);
        }
      }
      
      if (!foundPath) {
        this.logger.warn('⚠️ No se encontró archivo XML de SpotBugs');
        
        // Logging adicional: listar qué hay en target/
        try {
          const targetDir = path.join(projectDir, 'target');
          const targetContents = await fs.readdir(targetDir);
          this.logger.log(`📋 Contenido de target/: ${targetContents.slice(0, 10).join(', ')}${targetContents.length > 10 ? '...' : ''}`);
        } catch (e) {
          this.logger.log(`⚠️ No se pudo leer directorio target/: ${e.message}`);
        }
        
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: 'SpotBugs ejecutado pero no se generó archivo XML'
        };
      }

      // Parsear XML y extraer bugs
      this.logger.log('🔄 Paso 4: Parseando XML...');
      try {
        const xmlContent = await fs.readFile(foundPath, 'utf-8');
        this.logger.log(`✅ Archivo XML leído: ${foundPath} (${xmlContent.length} bytes)`);
        
        // Log del contenido inicial del XML
        if (xmlContent.length > 0) {
          const xmlPreview = xmlContent.substring(0, 500).replace(/\n/g, ' ');
          this.logger.log(`📄 XML preview: ${xmlPreview}`);
        }
        
        const result = await parseXmlAsync(xmlContent);
        this.logger.log(`✅ XML parseado correctamente`);
        
        // Inspeccionar estructura
        const rootKeys = Object.keys(result);
        this.logger.log(`📊 Estructura raíz: ${rootKeys.join(', ')}`);
        
        // SpotBugs genera BugCollection como raíz
        let bugCollection = (result as any).BugCollection;
        
        if (!bugCollection) {
          this.logger.error('❌ No se encontró BugCollection en XML');
          this.logger.log(`📦 Objeto raíz: ${JSON.stringify(result).substring(0, 200)}`);
          return {
            tool: 'spotbugs',
            success: false,
            findings: [],
            error: 'Estructura XML no contiene BugCollection'
          };
        }
        
        // Extraer BugInstance
        let bugInstances = bugCollection.BugInstance || [];
        
        this.logger.log(`🐛 BugInstance tipo: ${Array.isArray(bugInstances) ? 'ARRAY' : typeof bugInstances}`);
        
        // Convertir a array si es necesario
        let findings: any[] = [];
        if (Array.isArray(bugInstances)) {
          findings = bugInstances;
          this.logger.log(`✅ BugInstance es array con ${findings.length} elementos`);
        } else if (bugInstances && typeof bugInstances === 'object') {
          findings = [bugInstances];
          this.logger.log(`✅ BugInstance es objeto único - convertido a array`);
        } else {
          findings = [];
          this.logger.log(`⚠️ BugInstance no es array ni objeto: ${typeof bugInstances}`);
        }
        
        this.logger.log(`🐛 SpotBugs encontró ${findings.length} bugs`);
        
        if (findings.length > 0) {
          const firstBugPreview = JSON.stringify(findings[0]).substring(0, 300);
          this.logger.log(`   📍 Primer bug: ${firstBugPreview}`);
        }
        
        return {
          tool: 'spotbugs',
          success: findings.length > 0,
          findings: findings,
          findingsCount: findings.length
        };
      } catch (parseError) {
        this.logger.error(`❌ Error parseando XML: ${parseError.message}`);
        this.logger.error(`📋 Stack: ${parseError.stack}`);
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: `Error parseando XML de SpotBugs: ${parseError.message}`
        };
      }
    } catch (error) {
      this.logger.error('Error en runSpotBugsWithMaven:', error.message);
      return {
        tool: 'spotbugs',
        success: false,
        findings: [],
        error: error.message
      };
    }
  }

  private async runSpotBugsDirectly(projectDir: string): Promise<ToolResult> {
    this.logger.log('📝 Sin pom.xml detectado - SpotBugs requiere Maven o CLI instalado');
    
    try {
      // Verificar si spotbugs CLI está disponible
      this.logger.log('🔍 Verificando disponibilidad de SpotBugs CLI...');
      try {
        await execAsync('spotbugs -version', { timeout: 5000 });
        this.logger.log('✅ SpotBugs CLI disponible');
      } catch (versionError) {
        this.logger.warn('⚠️ SpotBugs CLI no está instalado');
        this.logger.log('ℹ️ SpotBugs omitido - Se requiere pom.xml (Maven) o SpotBugs CLI instalado globalmente');
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          rawOutput: 'SpotBugs CLI no disponible. Se requiere Maven (pom.xml) para ejecutar SpotBugs.'
        };
      }

      // Si llegamos aquí, SpotBugs CLI está disponible
      // Paso 1: Buscar archivos .java
      this.logger.log('🔍 Paso 1: Buscando archivos .java...');
      const javaFiles = await this.findFiles(projectDir, '**/*.java');
      
      if (javaFiles.length === 0) {
        this.logger.warn('⚠️ No se encontraron archivos .java');
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: 'No se encontraron archivos .java en el proyecto'
        };
      }
      
      this.logger.log(`✅ Encontrados ${javaFiles.length} archivos .java`);
      
      // Paso 2: Compilar con javac
      this.logger.log('🔨 Paso 2: Compilando con javac...');
      const classDir = path.join(projectDir, 'target', 'classes');
      
      try {
        // Crear directorio de salida
        await fs.mkdir(classDir, { recursive: true });
        
        // Compilar todos los .java files
        const javaFilesStr = javaFiles.map(f => `"${f}"`).join(' ');
        const compileCmd = `javac -d "${classDir}" ${javaFilesStr}`;
        
        this.logger.log(`Compilando ${javaFiles.length} archivos Java...`);
        await execAsync(compileCmd, { cwd: projectDir, timeout: 60000 });
        this.logger.log('✅ Compilación con javac completada');
      } catch (compileError) {
        this.logger.warn(`⚠️ Error compilando con javac: ${compileError.message}`);
        // Continuar de todos modos, algunos archivos pueden haber compilado
      }
      
      // Paso 3: Buscar archivos .class compilados
      this.logger.log('📂 Paso 3: Buscando archivos .class compilados...');
      const classFiles = await this.findFiles(classDir, '**/*.class');
      
      if (classFiles.length === 0) {
        this.logger.warn('⚠️ No se encontraron archivos .class compilados');
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: 'No se pudieron compilar los archivos Java'
        };
      }
      
      this.logger.log(`✅ Encontrados ${classFiles.length} archivos .class`);
      
      // Paso 4: Ejecutar SpotBugs CLI
      this.logger.log('🐛 Paso 4: Ejecutando SpotBugs CLI...');
      
      const outputXml = path.join(projectDir, 'spotbugs-output.xml');
      const spotbugsCmd = `spotbugs -textui -output "${outputXml}" -outputFormat xml "${classDir}"`;
      
      try {
        this.logger.log(`Ejecutando: ${spotbugsCmd}`);
        await execAsync(spotbugsCmd, { timeout: 120000 });
      } catch (e) {
        // SpotBugs puede devolver exit code diferente de 0 incluso si genera el XML
        this.logger.warn('⚠️ SpotBugs completó (puede haber bugs detectados)');
      }
      
      // Paso 5: Parsear XML
      this.logger.log('🔄 Paso 5: Parseando XML...');
      
      if (!await this.fileExists(outputXml)) {
        this.logger.warn('⚠️ SpotBugs no generó archivo XML');
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: 'SpotBugs no generó archivo de resultados XML'
        };
      }
      
      try {
        const xmlContent = await fs.readFile(outputXml, 'utf-8');
        const result = await parseXmlAsync(xmlContent);
        
        const bugInstances = (result as any).BugCollection?.BugInstance || [];
        const findings = Array.isArray(bugInstances) ? bugInstances : (bugInstances ? [bugInstances] : []);
        
        this.logger.log(`✅ SpotBugs encontró ${findings.length} bugs`);
        
        return {
          tool: 'spotbugs',
          success: findings.length > 0,
          findings: findings,
          findingsCount: findings.length
        };
      } catch (parseError) {
        this.logger.error(`Error parseando XML: ${parseError.message}`);
        return {
          tool: 'spotbugs',
          success: false,
          findings: [],
          error: `Error parseando XML de SpotBugs: ${parseError.message}`
        };
      }
    } catch (error) {
      this.logger.error('Error en runSpotBugsDirectly:', error.message);
      return {
        tool: 'spotbugs',
        success: false,
        findings: [],
        error: error.message
      };
    }
  }

  private async runPMD(projectDir: string): Promise<ToolResult> {
    this.logger.log('═══════════════════════════════════════');
    this.logger.log('📋 INICIANDO ANÁLISIS DIRECTO CON PMD');
    this.logger.log('═══════════════════════════════════════');
    this.logger.log(`    Directorio del proyecto: ${projectDir}`);
    
    try {
      // Paso 1: Verificar que PMD está disponible y obtener versión
      this.logger.log(`1️⃣  Verificando disponibilidad de PMD...`);
      
      let pmdCommand = 'pmd';
      let pmdAvailable = false;
      let pmdVersion = '';
      
      try {
        const versionResult = await execAsync('pmd --version', { timeout: 5000 });
        pmdVersion = versionResult.stdout.toString().trim().split('\n')[0];
        this.logger.log(`    ✅ PMD disponible como comando global`);
        this.logger.log(`    Versión: ${pmdVersion}`);
        pmdAvailable = true;
      } catch (versionError) {
        this.logger.warn(`    ⚠️  PMD no encontrado como comando global`);
        this.logger.log(`    Error: ${(versionError as any).message.substring(0, 100)}`);
        
        // Intentar buscar PMD en rutas comunes
        const possiblePaths = [
          path.join(projectDir, 'tools/pmd/pmd-bin-*/bin/pmd'),
          path.join(process.env.PROGRAMFILES || '', 'pmd/bin/pmd'),
          path.join(process.env.APPDATA || '', 'npm/pmd'),
          path.join(process.env.HOME || '', '.local/bin/pmd'),
          '/usr/local/bin/pmd',
          'C:\\Program Files\\pmd\\bin\\pmd.bat'
        ];
        
        for (const possiblePath of possiblePaths) {
          try {
            const expandedPath = possiblePath.replace(/\*/g, '7.0.0');
            if (process.platform === 'win32') {
              const batchPath = expandedPath.endsWith('.bat') ? expandedPath : `${expandedPath}.bat`;
              const versionCheck = await execAsync(`"${batchPath}" --version`, { timeout: 5000 });
              pmdCommand = `"${batchPath}"`;
              pmdVersion = versionCheck.stdout.toString().trim().split('\n')[0];
              pmdAvailable = true;
              this.logger.log(`    ✅ PMD encontrado en: ${batchPath}`);
              this.logger.log(`    Versión: ${pmdVersion}`);
              break;
            } else {
              const versionCheck = await execAsync(`"${expandedPath}" --version`, { timeout: 5000 });
              pmdCommand = `"${expandedPath}"`;
              pmdVersion = versionCheck.stdout.toString().trim().split('\n')[0];
              pmdAvailable = true;
              this.logger.log(`    ✅ PMD encontrado en: ${expandedPath}`);
              this.logger.log(`    Versión: ${pmdVersion}`);
              break;
            }
          } catch (e) {
            // Continuar con siguiente opción
          }
        }
      }
      
      if (!pmdAvailable) {
        this.logger.warn(`⚠️  PMD no está disponible en el sistema`);
        this.logger.log('    PMD se saltará. Se usarán otros análisis disponibles.');
        this.logger.log('═══════════════════════════════════════');
        
        return {
          tool: 'pmd',
          success: false,
          findings: [],
          error: 'PMD no está instalado o no está en el PATH del sistema'
        };
      }

      // Paso 2: Encontrar directorio de fuentes Java
      this.logger.log(`2️⃣  Buscando archivos Java...`);
      
      const srcPath = await this.findJavaSourceDir(projectDir);
      const analyzeDir = srcPath || projectDir;
      
      this.logger.log(`    Directorio a analizar: ${analyzeDir}`);
      
      // Verificar que hay archivos Java
      try {
        const { stdout: javaFiles } = await execAsync(
          process.platform === 'win32' 
            ? `dir /s /b "${analyzeDir}\\*.java" 2>nul | find /c /v ""` 
            : `find "${analyzeDir}" -name "*.java" | wc -l`,
          { timeout: 5000, shell: true } as any
        );
        
        const javaFileCount = parseInt(javaFiles.toString().trim()) || 0;
        this.logger.log(`    Archivos Java encontrados: ${javaFileCount}`);
        
        if (javaFileCount === 0) {
          this.logger.log(`    ⚠️  No hay archivos Java para analizar`);
          this.logger.log('═══════════════════════════════════════');
          return {
            tool: 'pmd',
            success: true,
            findings: [],
            rawOutput: 'PMD: No hay archivos Java en el proyecto'
          };
        }
      } catch (e) {
        this.logger.log(`    ℹ️  No se pudo contar archivos Java: ${(e as any).message.substring(0, 50)}`);
      }

      // Paso 3: Configurar ruleset personalizado con TODAS las reglas
      this.logger.log(`3️⃣  Preparando ruleset de PMD...`);
      
      const rulesetPath = path.join(projectDir, 'pmd-ruleset.xml');
      
      let rulesParam = '';
      const rulesetExists = await this.fileExists(rulesetPath);
      
      if (rulesetExists) {
        this.logger.log(`    ✅ Archivo ruleset personalizado encontrado en: ${rulesetPath}`);
        rulesParam = `--rulesets "${rulesetPath}"`;
      } else {
        this.logger.log(`    ⚠️  Ruleset personalizado no encontrado`);
        this.logger.log(`    Usando múltiples categorías de reglas built-in...`);
        // Usar TODAS las categorías de reglas disponibles para máxima detección
        rulesParam = `--rulesets category/java/errorprone.xml,category/java/bestpractices.xml,category/java/security.xml,category/java/performance.xml,category/java/design.xml,category/java/codestyle.xml`;
      }
      
      // Paso 4: Ejecutar PMD directamente (NO vía Maven)
      const outputPath = path.join(projectDir, 'pmd-results.xml');
      
      this.logger.log(`4️⃣  Ejecutando PMD directamente...`);
      this.logger.log(`    Archivo de salida: ${outputPath}`);
      this.logger.log(`    Comando base: ${pmdCommand}`);
      
      // Construir comando PMD optimizado
      // - check: ejecutar verificación de código
      // - --dir: directorio a analizar
      // - --format xml: generar reporte XML
      // - --rulesets: usar las reglas
      // - --report-file: guardar en archivo
      // - --verbose: modo verbose para ver detalles
      // - --no-cache: no usar caché (asegurar análisis fresco)
      // - --fail-on-violation-count: reportar violaciones
      const command = `${pmdCommand} check --dir "${analyzeDir}" --format xml ${rulesParam} --report-file "${outputPath}" --verbose --no-cache`;
      
      this.logger.log(`    Comando: ${command.substring(0, 300)}`);
      
      let stdout = '';
      let stderr = '';
      let executionSuccess = false;
      
      try {
        this.logger.log(`    ⏳ Ejecutando (timeout: 180 segundos)...`);
        const result = await execAsync(command, { 
          timeout: 180000, 
          maxBuffer: 10 * 1024 * 1024,
          shell: true,
          windowsHide: true
        } as any);
        stdout = result.stdout?.toString() || '';
        stderr = result.stderr?.toString() || '';
        this.logger.log(`    ✅ PMD ejecutado exitosamente (exit code 0 - sin violaciones)`);
        executionSuccess = true;
      } catch (execError: any) {
        stdout = execError.stdout?.toString() || '';
        stderr = execError.stderr?.toString() || '';
        const errorMsg = stderr || execError.message || '';
        const exitCode = execError.code;
        
        // PMD retorna diferentes códigos:
        // 0 = Sin violaciones
        // 1 = Error
        // 4 = Violaciones encontradas (¡esto es lo que queremos!)
        if (exitCode === 4 || errorMsg.includes('Reportable violations') || errorMsg.includes('violations found')) {
          this.logger.log(`    ℹ️  PMD encontró violaciones (exit code: ${exitCode})`);
          this.logger.log(`    Esto es NORMAL y ESPERADO - PMD retorna 4 cuando detecta problemas`);
          executionSuccess = true;
        } else if (exitCode === 0) {
          this.logger.log(`    ℹ️  PMD ejecutado sin problemas encontrados (exit code 0)`);
          executionSuccess = true;
        } else {
          this.logger.warn(`    ⚠️  PMD retornó exit code: ${exitCode}`);
          this.logger.log(`    Mensaje: ${execError.message.substring(0, 200)}`);
          this.logger.log(`    Intentando continuar...`);
          // Continuar de todos modos
          executionSuccess = true;
        }
      }
      
      if (stdout) {
        this.logger.log(`    📊 Salida PMD: ${stdout.substring(0, 300)}`);
      }
      if (stderr) {
        this.logger.log(`    📝 Stderr: ${stderr.substring(0, 300)}`);
      }

      // Paso 5: Verificar y parsear resultados
      this.logger.log(`5️⃣  Verificando archivo de resultados...`);
      
      const fileExists = await this.fileExists(outputPath);
      
      if (!fileExists) {
        this.logger.log(`    ❌ Archivo XML no fue creado en: ${outputPath}`);
        
        // Listar archivos en el directorio
        try {
          const { stdout: dirContents } = await execAsync(
            process.platform === 'win32'
              ? `dir "${projectDir}" /b`
              : `ls -la "${projectDir}"`,
            { timeout: 5000, shell: true } as any
          );
          this.logger.log(`    📁 Contenido del directorio:`);
          const files = dirContents.toString().trim().split('\n').slice(0, 15);
          files.forEach(f => this.logger.log(`       ${f}`));
        } catch (e) {
          this.logger.log(`    Error listando directorio`);
        }
        
        this.logger.log('═══════════════════════════════════════');
        return {
          tool: 'pmd',
          success: false,
          findings: [],
          error: 'PMD no generó archivo de resultados XML'
        };
      }
      
      this.logger.log(`    ✅ Archivo XML encontrado`);
      
      try {
        const xmlContent = await fs.readFile(outputPath, 'utf-8');
        this.logger.log(`6️⃣  Parseando resultado XML...`);
        this.logger.log(`    Tamaño: ${xmlContent.length} bytes`);
        
        // Mostrar inicio del XML
        if (xmlContent.length > 0) {
          this.logger.log(`    Inicio: ${xmlContent.substring(0, 200).replace(/\n/g, ' ')}`);
        }
        
        if (!xmlContent || xmlContent.trim() === '') {
          this.logger.log(`    ℹ️  Archivo XML vacío - No se encontraron violaciones`);
          this.logger.log('═══════════════════════════════════════');
          return {
            tool: 'pmd',
            success: true,
            findings: [],
            rawOutput: `PMD completado: No se encontraron violaciones`
          };
        }
        
        // Parsear XML
        const result = await parseXmlAsync(xmlContent);
        this.logger.log(`    Elementos raíz: ${Object.keys(result).join(', ')}`);
        
        const findings: any[] = [];
        
        // Buscar violaciones en estructura PMD estándar
        if ((result as any).pmd?.file) {
          const files = Array.isArray((result as any).pmd.file) 
            ? (result as any).pmd.file 
            : [(result as any).pmd.file];
          
          this.logger.log(`    📁 Archivos analizados: ${files.length}`);
          
          files.forEach((file: any, fileIdx: number) => {
            const filename = file.$.name || `Archivo ${fileIdx}`;
            this.logger.log(`      [${fileIdx + 1}] ${filename}`);
            
            if (file.violation) {
              const violations = Array.isArray(file.violation) 
                ? file.violation 
                : [file.violation];
              
              this.logger.log(`          📍 ${violations.length} violaciones`);
              
              violations.forEach((v: any, vIdx: number) => {
                try {
                  const priority = parseInt(v.$.priority) || 4;
                  
                  // FILTRO: Solo incluir vulnerabilidades críticas (P1) y altas (P2)
                  // Ignorar sugerencias de mejora (P3, P4, P5)
                  if (priority > 2) {
                    return; // Saltar sugerencias de mejora de código
                  }
                  
                  // Extraer mensaje desde diferentes ubicaciones en la estructura XML
                  let messageText = '';
                  if (v.$.message) {
                    messageText = v.$.message;
                  } else if (v._) {
                    messageText = v._;
                  } else if (Array.isArray(v.message) && v.message[0]) {
                    messageText = v.message[0]._ || v.message[0];
                  }
                  
                  // Solo incluir si tiene mensaje válido
                  if (!messageText || messageText.trim() === '') {
                    return;
                  }
                  
                  const violation = {
                    file: filename,
                    line: parseInt(v.$.line) || 0,
                    column: parseInt(v.$.column) || 0,
                    endLine: parseInt(v.$.endline) || 0,
                    endColumn: parseInt(v.$.endcolumn) || 0,
                    message: messageText,
                    rule: v.$.rule || 'UnknownRule',
                    priority: priority,
                    ruleSet: v.$.ruleSet || 'Unknown',
                    class: v.$.class || '',
                    method: v.$.method || '',
                    externalInfoUrl: v.$.externalInfoUrl || ''
                  };
                  
                  findings.push(violation);
                  
                  const priorityEmoji = {
                    '1': '🔴',
                    '2': '🟠'
                  }[v.$.priority] || '⚙️';
                  
                  const displayMessage = messageText.substring(0, 80);
                  this.logger.log(`            ${vIdx + 1}. ${priorityEmoji} [P${v.$.priority}] ${v.$.rule}`);
                  this.logger.log(`               ${displayMessage}`);
                } catch (parseErr) {
                  this.logger.warn(`            Error parseando violación: ${(parseErr as any).message}`);
                }
              });
            }
          });
        } else {
          this.logger.log(`    ⚠️  Estructura XML diferente - buscando violaciones...`);
          this.logger.log(`    Elementos en raíz: ${Object.keys(result).join(', ')}`);
        }
        
        this.logger.log(`7️⃣  RESULTADO FINAL`);
        this.logger.log(`    ✅ Violaciones detectadas: ${findings.length}`);
        this.logger.log('═══════════════════════════════════════');
        
        return {
          tool: 'pmd',
          success: true,
          findings: findings,
          findingsCount: findings.length,
          rawOutput: `PMD completado correctamente. Encontradas ${findings.length} violaciones.`
        };
        
      } catch (xmlError) {
        this.logger.error(`Error parseando XML: ${(xmlError as any).message}`);
        this.logger.log('═══════════════════════════════════════');
        return {
          tool: 'pmd',
          success: false,
          findings: [],
          error: `Error parseando XML: ${(xmlError as any).message}`
        };
      }
      
    } catch (error: any) {
      this.logger.error(`Error general en PMD: ${error.message}`);
      this.logger.log('═══════════════════════════════════════');
      return {
        tool: 'pmd',
        success: false,
        findings: [],
        error: error.message
      };
    }
  }

  private async runSemgrep(projectDir: string): Promise<ToolResult> {
    this.logger.log('Ejecutando Semgrep...');
    
    try {
      let semgrepCommand = 'semgrep';
      
      // Intentar primero con comando directo semgrep
      try {
        await execAsync('semgrep --version', { timeout: 5000 });
      } catch (error) {
        // Si falla, usar python -m semgrep (recomendado vs py -m semgrep)
        this.logger.log('Comando "semgrep" no encontrado, usando "python -m semgrep"');
        semgrepCommand = 'python -m semgrep';
      }
      
      const outputPath = path.join(projectDir, 'semgrep-results.json');
      
      // Semgrep MULTI-CONFIG: usar múltiples configuraciones para máxima detección
      const configs = [
        '--config=auto',
        '--config=p/security-audit',
        '--config=p/owasp-top-ten',
        '--config=p/javascript',
        '--config=p/java'
      ].join(' ');
      
      const command = `${semgrepCommand} ${configs} --json --verbose --output="${outputPath}" "${projectDir}"`;
      
      this.logger.log(`Ejecutando Semgrep: ${command}`);
      
      this.logger.log(`Ejecutando comando: ${command}`);
      
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 120000 });
        this.logger.log(`Semgrep completado exitosamente`);
        if (stdout) this.logger.log(`Semgrep stdout: ${stdout}`);
        if (stderr && !stderr.includes('deprecated')) {
          this.logger.warn(`Semgrep stderr: ${stderr}`);
        }
      } catch (execError) {
        // Semgrep puede "fallar" por advertencias pero aún generar resultados válidos
        this.logger.warn(`Semgrep proceso terminó con código de salida no-cero: ${execError.message}`);
        // Continuar para verificar si se generaron resultados
      }
      
      // Intentar leer resultados independientemente del exit code
      if (await this.fileExists(outputPath)) {
        try {
          const jsonContent = await fs.readFile(outputPath, 'utf-8');
          const result = JSON.parse(jsonContent);
          
          this.logger.log(`Semgrep procesó ${result.results?.length || 0} hallazgos`);
          
          return {
            tool: 'semgrep',
            success: true,
            findings: result.results || [],
            rawOutput: `Semgrep encontró ${result.results?.length || 0} hallazgos usando ${semgrepCommand} (con advertencias de deprecación)`
          };
        } catch (parseError) {
          this.logger.error(`Error parseando resultados de Semgrep: ${parseError.message}`);
          return {
            tool: 'semgrep',
            success: false,
            findings: [],
            error: `Error parseando resultados: ${parseError.message}`
          };
        }
      } else {
        // No hay archivo de resultados, verificar si hay archivos para analizar
        const hasCodeFiles = await this.hasAnalyzableFiles(projectDir);
        if (!hasCodeFiles) {
          return {
            tool: 'semgrep',
            success: true,
            findings: [],
            rawOutput: 'Semgrep ejecutado correctamente: No hay archivos de código para analizar'
          };
        } else {
          return {
            tool: 'semgrep',
            success: false,
            findings: [],
            error: 'Semgrep no generó archivo de resultados'
          };
        }
      }
    } catch (error) {
      // Filtrar advertencias de deprecación que no son errores reales
      const errorMsg = error.message;
      if (errorMsg.includes('deprecated as of 1.38.0')) {
        this.logger.warn('Semgrep muestra advertencia de deprecación pero funciona correctamente');
        // Intentar leer el archivo de resultados de todos modos
        const outputPath = path.join(projectDir, 'semgrep-results.json');
        if (await this.fileExists(outputPath)) {
          try {
            const jsonContent = await fs.readFile(outputPath, 'utf-8');
            const result = JSON.parse(jsonContent);
            return {
              tool: 'semgrep',
              success: true,
              findings: result.results || [],
              rawOutput: `Semgrep ejecutado con advertencias: ${result.results?.length || 0} hallazgos`
            };
          } catch (parseError) {
            // Si no se puede parsear, continuar con el error original
          }
        }
      }
      
      this.logger.error('Error ejecutando Semgrep:', error.message);
      return {
        tool: 'semgrep',
        success: false,
        findings: [],
        error: `Semgrep no disponible: ${error.message}`
      };
    }
  }

  // Métodos auxiliares
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Método para detectar problemas de código directamente si las herramientas fallan
  private async detectCodeIssuesDirectly(projectDir: string): Promise<any[]> {
    const issues = [];
    
    try {
      
      this.logger.log(`🔍 Iniciando detección directa en: ${projectDir}`);
      
      // Leer archivos Java y buscar patrones problemáticos
      const javaFiles = await this.findFilesRecursively(projectDir, '.java');
      this.logger.log(`📄 Archivos Java encontrados: ${javaFiles.length}`);
      if (javaFiles.length > 0) {
        this.logger.log(`   Primeros 3 archivos: ${javaFiles.slice(0, 3).join(', ')}`);
      }
      
      for (const javaFile of javaFiles) {
        const content = await fs.readFile(javaFile, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const lineNum = index + 1;
          
          // =================== JAVA SECURITY VULNERABILITIES ===================
          
          // 1. SQL INJECTION - String concatenation in SQL queries
          if ((line.includes('executeQuery') || line.includes('executeUpdate') || line.includes('execute(')) &&
              (line.includes('" + ') || line.includes('+ "') || line.includes('String.format'))) {
            issues.push({
              type: 'SQL Injection',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'SQL Injection vulnerability - Use PreparedStatement instead of string concatenation',
              code: line.trim()
            });
          }
          
          // 2. SQL INJECTION - Direct SELECT statements with concatenation
          if ((line.includes('"SELECT') || line.includes("'SELECT")) && 
              (line.includes('" + ') || line.includes("' + ") || line.includes('String.format'))) {
            issues.push({
              type: 'SQL Injection',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'SQL Injection vulnerability - Use parameterized queries',
              code: line.trim()
            });
          }
          
          // 3. COMMAND INJECTION - Runtime.exec() with unsanitized input
          if ((line.includes('Runtime.getRuntime().exec') || line.includes('new ProcessBuilder')) &&
              (line.includes('" + ') || line.includes('+ "') || line.includes('String.format') || line.includes('concatenat'))) {
            issues.push({
              type: 'Command Injection',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Command Injection vulnerability - Use Runtime.exec(String[]) with array instead of concatenation',
              code: line.trim()
            });
          }
          
          // 3b. COMMAND INJECTION - Bare Runtime.exec() call (ANY form)
          if (line.includes('Runtime.getRuntime().exec')) {
            // Flag any exec() call without explicit protection
            const prevLines = lines.slice(Math.max(0, index - 5), index).join(' ');
            if (!prevLines.includes('whitelist') && !prevLines.includes('sanitize') && !prevLines.includes('validate')) {
              issues.push({
                type: 'Command Injection',
                path: javaFile,
                start: { line: lineNum },
                severity: 'CRITICAL',
                message: 'Command execution detected (Runtime.getRuntime().exec) - Ensure input is from trusted sources only',
                code: line.trim()
              });
            }
          }
          
          // 3c. COMMAND INJECTION - detect cmd.exe /c pattern with concatenation
          if (line.includes('cmd.exe /c') && (line.includes('" + ') || line.includes('+ "'))) {
            issues.push({
              type: 'Command Injection',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Command Injection vulnerability - User input concatenated into system command',
              code: line.trim()
            });
          }
          
          // 3d. COMMAND INJECTION - ProcessBuilder with concatenated strings
          if (line.includes('new ProcessBuilder') && (line.includes('" + ') || line.includes('+ "'))) {
            issues.push({
              type: 'Command Injection',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Command Injection - ProcessBuilder with concatenated strings is dangerous',
              code: line.trim()
            });
          }
          
          // 4. PATH TRAVERSAL - File operations with unsanitized paths
          if ((line.includes('new File(') || line.includes('new FileInputStream') || 
               line.includes('new FileOutputStream') || line.includes('Paths.get(')) &&
              (line.includes('" + ') || line.includes('+ "') || line.includes('String.format'))) {
            issues.push({
              type: 'Path Traversal',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Path Traversal vulnerability - Validate file paths, prevent ".." sequences',
              code: line.trim()
            });
          }
          
          // 4b. PATH TRAVERSAL - Detect "/safe/directory/" + user input pattern
          if ((line.includes('new File(') || line.includes('new FileInputStream') || line.includes('new FileOutputStream')) &&
              (line.includes('" + ') || line.includes('filename') || line.includes('filepath'))) {
            issues.push({
              type: 'Path Traversal',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Path Traversal vulnerability - User-controlled path concatenation detected',
              code: line.trim()
            });
          }
          
          // 4c. PATH TRAVERSAL - Any File() constructor with variables
          if (line.includes('new File(') && (line.includes('parameter') || line.includes('request.') || 
                                             line.includes('input') || line.includes('userPath') || 
                                             line.includes('filename') || line.match(/new File\([a-zA-Z]/))) {
            // Check if there's validation
            const nextLines = lines.slice(index + 1, Math.min(index + 8, lines.length)).join(' ');
            if (!nextLines.includes('.startsWith(') && !nextLines.includes('.contains("..") == false') && !nextLines.includes('getCanonicalPath')) {
              issues.push({
                type: 'Path Traversal',
                path: javaFile,
                start: { line: lineNum },
                severity: 'CRITICAL',
                message: 'Path Traversal risk - Ensure file paths are validated and do not contain ".." sequences',
                code: line.trim()
              });
            }
          }
          
          // 4d. PATH TRAVERSAL - FileOutputStream with user input
          if (line.includes('new FileOutputStream(') && (line.includes('" + ') || line.includes('parameter') || line.includes('request.'))) {
            issues.push({
              type: 'Path Traversal',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Path Traversal in file output - Validate file paths before creating/writing files',
              code: line.trim()
            });
          }
          
          // 5. HARDCODED CREDENTIALS - DB passwords, API keys, etc
          if (line.match(/\b(DB_USER|DB_PASSWORD|PASSWORD|password|apiKey|api_key|API_KEY|SECRET|secret|TOKEN|token|CREDENTIAL)\s*[=:]\s*["']/i) ||
              (line.includes('=') && line.includes('"') && 
               line.match(/(password|secret|token|api_key|db_password|user|credential)/i) &&
               !line.includes('null') && !line.includes('getPassword') && !line.includes('final String'))) {
            issues.push({
              type: 'Hardcoded Credential',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Hardcoded credential detected - Store in environment variables or secure vault',
              code: line.trim()
            });
          }
          
          // 6. INSECURE RANDOM - Using Random instead of SecureRandom
          if (line.includes('new Random()')) {
            issues.push({
              type: 'Insecure Randomness',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Insecure Randomness - Use SecureRandom for cryptographic operations like tokens',
              code: line.trim()
            });
          }
          
          // 6b. INSECURE RANDOM - random.nextLong(), random.nextInt() used for security tokens
          if ((line.includes('random.nextLong()') || line.includes('random.nextInt()')) &&
              (line.includes('token') || line.includes('Token') || line.includes('seed') || line.includes('Seed'))) {
            issues.push({
              type: 'Insecure Randomness',
              path: javaFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'Insecure Randomness - Use SecureRandom for security tokens and cryptographic operations',
              code: line.trim()
            });
          }
          
          // 7. NULL POINTER DEREFERENCE - accessing variable after setting to null
          if (line.includes('= null')) {
            const varMatch = line.match(/(\w+)\s*=\s*null/);
            if (varMatch) {
              const varName = varMatch[1];
              // Check next few lines for dereference
              for (let i = 1; i < 5 && index + i < lines.length; i++) {
                if (lines[index + i].includes(varName + '.') || 
                    lines[index + i].includes(varName + '(') ||
                    lines[index + i].includes(varName + '[')) {
                  issues.push({
                    type: 'Null Pointer Dereference',
                    path: javaFile,
                    start: { line: lineNum + i },
                    severity: 'HIGH',
                    message: `Variable '${varName}' set to null and dereferenced without null check`,
                    code: lines[index + i].trim()
                  });
                  break;
                }
              }
            }
          }
          
          // 8. RESOURCE LEAK - Streams and connections not closed
          if ((line.includes('new FileInputStream') || line.includes('new FileOutputStream') || 
               line.includes('new BufferedReader') || line.includes('new PrintWriter') ||
               line.includes('getConnection()') || line.includes('new Scanner(') ||
               line.includes('new Connection') || line.includes('new Statement') ||
               line.includes('new ResultSet')) && 
              !line.trim().startsWith('//')) {
            // Check if it's in a try-with-resources
            const prevLines = lines.slice(Math.max(0, index - 3), index).join(' ');
            if (!prevLines.includes('try') && !line.includes(';')) {
              let hasClose = false;
              for (let i = 1; i < 15 && index + i < lines.length; i++) {
                if (lines[index + i].includes('.close()')) {
                  hasClose = true;
                  break;
                }
              }
              if (!hasClose) {
                issues.push({
                  type: 'Resource Leak',
                  path: javaFile,
                  start: { line: lineNum },
                  severity: 'MEDIUM',
                  message: 'Resource may not be properly closed - Use try-with-resources or ensure close() is called',
                  code: line.trim()
                });
              }
            }
          }
          
          // 8b. RESOURCE LEAK - Connection from DriverManager
          if ((line.includes('DriverManager.getConnection') || line.includes('DataSource.getConnection')) &&
              !lines.slice(Math.max(0, index - 2), index).join(' ').includes('try')) {
            let hasCloseOrTry = false;
            for (let i = 0; i < 15 && index + i < lines.length; i++) {
              if (lines[index + i].includes('.close()') || lines[index + i].includes('finally')) {
                hasCloseOrTry = true;
                break;
              }
            }
            if (!hasCloseOrTry && !line.includes('try')) {
              issues.push({
                type: 'Resource Leak',
                path: javaFile,
                start: { line: lineNum },
                severity: 'MEDIUM',
                message: 'Database Connection resource leak - Use try-with-resources or ensure connection.close() is called in finally block',
                code: line.trim()
              });
            }
          }
          
          // 8c. RESOURCE LEAK - Statement not closed
          if ((line.includes('.createStatement()') || line.includes('.prepareStatement(')) &&
              !line.includes('try')) {
            let hasClose = false;
            for (let i = 1; i < 20 && index + i < lines.length; i++) {
              if (lines[index + i].includes('.close()') || lines[index + i].includes('finally')) {
                hasClose = true;
                break;
              }
            }
            if (!hasClose) {
              issues.push({
                type: 'Resource Leak',
                path: javaFile,
                start: { line: lineNum },
                severity: 'MEDIUM',
                message: 'SQL Statement resource leak - Ensure statement.close() is called in finally block',
                code: line.trim()
              });
            }
          }
          
          // 8d. RESOURCE LEAK - ResultSet not closed
          if ((line.includes('.executeQuery()') || line.includes('ResultSet')) &&
              !line.includes('try')) {
            let hasClose = false;
            for (let i = 1; i < 20 && index + i < lines.length; i++) {
              if (lines[index + i].includes('.close()') || lines[index + i].includes('finally')) {
                hasClose = true;
                break;
              }
            }
            if (!hasClose && !line.includes('new ResultSet')) {
              issues.push({
                type: 'Resource Leak',
                path: javaFile,
                start: { line: lineNum },
                severity: 'MEDIUM',
                message: 'ResultSet resource leak - Ensure resultSet.close() is called in finally block',
                code: line.trim()
              });
            }
          }
          
          // 8e. RESOURCE LEAK - BufferedReader without try-with-resources
          if (line.includes('new BufferedReader') && !line.includes('try')) {
            let hasClose = false;
            for (let i = 1; i < 20 && index + i < lines.length; i++) {
              if (lines[index + i].includes('.close()')) {
                hasClose = true;
                break;
              }
            }
            if (!hasClose) {
              issues.push({
                type: 'Resource Leak',
                path: javaFile,
                start: { line: lineNum },
                severity: 'MEDIUM',
                message: 'BufferedReader resource leak - Use try-with-resources or call .close() in finally block',
                code: line.trim()
              });
            }
          }
          
          // 9. XSS - User input written to output without escaping
          if ((line.includes('System.out.println') || line.includes('response.write') || 
               line.includes('.append(') || line.includes('getWriter().print')) &&
              (line.includes('" + ') || line.includes('+ "'))) {
            issues.push({
              type: 'Cross-Site Scripting (XSS)',
              path: javaFile,
              start: { line: lineNum },
              severity: 'HIGH',
              message: 'Potential XSS vulnerability - User input may not be properly escaped',
              code: line.trim()
            });
          }
          
          // 10. STRING COMPARISON with == for sensitive data
          if (line.includes('==') && (line.includes('"') || line.includes("'"))) {
            if (line.match(/(password|token|secret|credential|key)\s*==|==\s*(password|token|secret|credential|key)/i)) {
              issues.push({
                type: 'Insecure String Comparison',
                path: javaFile,
                start: { line: lineNum },
                severity: 'MEDIUM',
                message: 'Use .equals() instead of == for string comparison',
                code: line.trim()
              });
            }
          }
          
          // 11. Detecting general null dereference
          if (line.includes('== null') && lines[index + 1]?.includes('.')) {
            issues.push({
              type: 'Null Pointer Dereference',
              path: javaFile,
              start: { line: lineNum + 1 },
              severity: 'HIGH',
              message: 'Potential null pointer dereference',
              code: lines[index + 1].trim()
            });
          }
        });
      }
      
      // Leer archivos JavaScript y buscar vulnerabilidades
      const jsFiles = await this.findFilesRecursively(projectDir, '.js');
      this.logger.log(`📄 Archivos JavaScript encontrados: ${jsFiles.length}`);
      if (jsFiles.length > 0) {
        this.logger.log(`   Primeros 3 archivos: ${jsFiles.slice(0, 3).join(', ')}`);
      }
      
      for (const jsFile of jsFiles) {
        const content = await fs.readFile(jsFile, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const lineNum = index + 1;
          
          // =================== JAVASCRIPT VULNERABILITIES ===================
          
          // 1. CODE INJECTION - eval()
          if (line.includes('eval(')) {
            issues.push({
              type: 'Code Injection',
              path: jsFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'eval() executes arbitrary code - Use Function() or avoid dynamic code execution',
              code: line.trim()
            });
          }
          
          // 2. XSS - innerHTML assignment
          if (line.includes('.innerHTML') || line.includes('.innerHTML =')) {
            issues.push({
              type: 'Cross-Site Scripting (XSS)',
              path: jsFile,
              start: { line: lineNum },
              severity: 'HIGH',
              message: 'Direct innerHTML assignment can lead to XSS - Use textContent or DOM methods',
              code: line.trim()
            });
          }
          
          // 3. HARDCODED SECRETS
          if (line.match(/\b(API_KEY|SECRET|PASSWORD|TOKEN|apiKey|secretKey|apiSecret)\s*[=:]\s*["']/i)) {
            issues.push({
              type: 'Hardcoded Secret',
              path: jsFile,
              start: { line: lineNum },
              severity: 'HIGH',
              message: 'Hardcoded secret detected - Use environment variables',
              code: line.trim()
            });
          }
          
          // 4. SQL INJECTION
          if ((line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE') || line.includes('DELETE')) &&
              (line.includes('" + ') || line.includes('+ "') || line.includes('${') || line.includes('`'))) {
            issues.push({
              type: 'SQL Injection',
              path: jsFile,
              start: { line: lineNum },
              severity: 'CRITICAL',
              message: 'SQL Injection - Use parameterized queries instead of concatenation',
              code: line.trim()
            });
          }
        });
      }
      
    } catch (error) {
      this.logger.error('❌ Error en detección directa:', error.message, error.stack);
    }
    
    this.logger.log(`✅ Detección directa completada: ${issues.length} problemas encontrados`);
    return issues;
  }

  private async findFilesRecursively(dir: string, extension: string): Promise<string[]> {
    const results = [];
    
    try {
      if (!await this.fileExists(dir)) {
        this.logger.warn(`⚠️ Directorio no existe: ${dir}`);
        return [];
      }
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      this.logger.debug(`📂 Explorando ${dir}: ${entries.length} entradas`);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...(await this.findFilesRecursively(fullPath, extension)));
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          results.push(fullPath);
          this.logger.debug(`✅ Encontrado: ${fullPath}`);
        }
      }
    } catch (error) {
      this.logger.warn(`⚠️ Error leyendo directorio ${dir}: ${error.message}`);
    }
    
    return results;
  }

  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    // Implementación simple de búsqueda de archivos compatible con Windows y Linux
    try {
      const ext = pattern.includes('.') ? pattern.substring(pattern.lastIndexOf('.')) : pattern;
      const command = process.platform === 'win32'
        ? `dir /s /b "${dir}\\*${ext}"`
        : `find "${dir}" -name "*${ext}"`;
      
      const { stdout } = await execAsync(command, { timeout: 10000, shell: true } as any);
      return stdout.toString().trim().split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }

  private async findJavaSourceDir(projectDir: string): Promise<string | null> {
    const possiblePaths = [
      path.join(projectDir, 'src', 'main', 'java'),
      path.join(projectDir, 'src'),
      projectDir
    ];
    
    for (const srcPath of possiblePaths) {
      if (await this.fileExists(srcPath)) {
        try {
          // Usar comando compatible con Windows y Linux
          const command = process.platform === 'win32'
            ? `dir /s /b "${srcPath}\\*.java"`
            : `find "${srcPath}" -name "*.java"`;
          
          const { stdout } = await execAsync(command, { timeout: 5000, shell: true } as any);
          if (stdout.toString().trim()) {
            return srcPath;
          }
        } catch {
          continue;
        }
      }
    }
    
    return null;
  }

  private async hasAnalyzableFiles(projectDir: string): Promise<boolean> {
    try {
      // Buscar archivos de código comunes que Semgrep puede analizar
      const extensions = ['*.java', '*.js', '*.ts', '*.py', '*.go', '*.c', '*.cpp', '*.php', '*.rb'];
      
      for (const ext of extensions) {
        try {
          // Usar comando compatible con Windows y Linux
          const command = process.platform === 'win32'
            ? `dir /s /b "${projectDir}\\${ext}"`
            : `find "${projectDir}" -name "${ext}"`;
          
          const { stdout } = await execAsync(command, { timeout: 5000, shell: true } as any);
          if (stdout.toString().trim()) {
            return true;
          }
        } catch {
          // Continúa con la siguiente extensión
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}