import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  async ensureUploadsDir(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      this.logger.log('Creado directorio de uploads');
    }
  }

  async saveAndExtractFile(fileBuffer: Buffer, originalName: string): Promise<string> {
    this.logger.log(`=== [INICIO] SAVING FILE: ${originalName} (${fileBuffer.length} bytes) ===`);
    
    // Validar que no sea archivo .rar
    const ext = path.extname(originalName).toLowerCase();
    if (ext === '.rar') {
      const error = 'Los archivos .rar no están soportados. Por favor usa archivos .zip';
      this.logger.error(`[ERROR] ${error}`);
      throw new Error(error);
    }
    
    try {
      this.logger.log(`[PASO 1] Verificando directorio uploads...`);
      await this.ensureUploadsDir();
      
      const projectId = uuidv4();
      const projectDir = path.join(this.uploadsDir, projectId);
      this.logger.log(`[PASO 2] Creando directorio proyecto: ${projectDir}`);
      await fs.mkdir(projectDir, { recursive: true });

      const filePath = path.join(projectDir, originalName);
      this.logger.log(`[PASO 3] Escribiendo archivo en: ${filePath}`);
      await fs.writeFile(filePath, fileBuffer);

      // Verificar que el archivo se escribió correctamente
      const stats = await fs.stat(filePath);
      this.logger.log(`[PASO 3 VERIFICADO] Archivo guardado correctamente. Tamaño en disco: ${stats.size} bytes`);

      // Extraer archivo según su tipo
      if (this.isCompressedFile(originalName)) {
        const ext = path.extname(originalName).toLowerCase();
        this.logger.log(`[PASO 4] Archivo comprimido detectado: ${originalName} (extensión: ${ext})`);
        
        this.logger.log(`[PASO 5] Iniciando extracción...`);
        await this.extractFile(filePath, projectDir);
        this.logger.log(`[PASO 5 COMPLETADO] Archivo extraído en: ${projectDir}`);
        
        // Verificar contenido extraído
        const extractedContents = await fs.readdir(projectDir);
        this.logger.log(`[VERIFICACIÓN] Contenido del directorio extraído: ${extractedContents.join(', ')}`);
      } else {
        this.logger.log(`[INFO] Archivo no comprimido: ${originalName}`);
      }

      this.logger.log(`=== [ÉXITO] Procesamiento completado. Directorio: ${projectDir} ===`);
      return projectDir;
    } catch (error) {
      this.logger.error(`=== [ERROR CRÍTICO] saveAndExtractFile falló ===`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  private isCompressedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.zip', '.7z', '.tar', '.tar.gz'].includes(ext);
  }

  private async extractFile(filePath: string, extractDir: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    this.logger.log(`[EXTRACT] Procesando archivo con extensión: ${ext}`);
    
    try {
      if (ext === '.zip') {
        this.logger.log(`[EXTRACT ZIP] Iniciando extracción ZIP de: ${filePath}`);
        await this.extractZipFile(filePath, extractDir);
        this.logger.log(`[EXTRACT ZIP] Completado exitosamente`);
      } else {
        this.logger.warn(`[EXTRACT] Tipo de archivo ${ext} no requiere extracción o no está soportado`);
      }
    } catch (error) {
      this.logger.error(`[EXTRACT ERROR] Error extrayendo archivo ${filePath}: ${error.message}`);
      this.logger.error(`[EXTRACT ERROR] Stack: ${error.stack}`);
      throw new Error(`Error al extraer el archivo: ${error.message}`);
    }
  }

  private async extractZipFile(zipPath: string, extractDir: string): Promise<void> {
    this.logger.log(`Extrayendo ZIP: ${zipPath} -> ${extractDir}`);
    
    try {
      await fsSync.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();
      
      this.logger.log(`ZIP extraído exitosamente`);
    } catch (error) {
      this.logger.error(`Error extrayendo ZIP: ${error.message}`);
      throw error;
    }
  }

  async findProjectFiles(projectDir: string): Promise<{
    javaFiles: string[];
    pythonFiles: string[];
    jsFiles: string[];
    allFiles: string[];
  }> {
    const files = await this.walkDirectory(projectDir);
    
    return {
      javaFiles: files.filter(f => f.endsWith('.java')),
      pythonFiles: files.filter(f => f.endsWith('.py')),
      jsFiles: files.filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx')),
      allFiles: files
    };
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        // Evitar directorios de dependencias y build
        if (!['node_modules', 'target', 'build', 'dist', '.git'].includes(item)) {
          files.push(...await this.walkDirectory(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  async cleanupProject(projectDir: string): Promise<void> {
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
      this.logger.log(`Proyecto limpiado: ${projectDir}`);
    } catch (error) {
      this.logger.error(`Error limpiando proyecto: ${error.message}`);
    }
  }

  async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Error leyendo archivo ${filePath}: ${error.message}`);
      throw new Error(`No se pudo leer el archivo: ${error.message}`);
    }
  }

  async cloneRepository(repositoryUrl: string, analysisId: string): Promise<string> {
    this.logger.log(`🔄 Iniciando clonación de repositorio: ${repositoryUrl}`);
    
    try {
      // Crear directorio para el repositorio clonado
      await this.ensureUploadsDir();
      
      const cloneDir = path.join(this.uploadsDir, `repo_${analysisId}`);
      
      // Verificar que el directorio no exista
      try {
        await fs.access(cloneDir);
        // Si existe, eliminarlo
        await fs.rm(cloneDir, { recursive: true, force: true });
      } catch {
        // No existe, es lo que queremos
      }
      
      // Crear directorio
      await fs.mkdir(cloneDir, { recursive: true });
      this.logger.log(`📁 Directorio creado: ${cloneDir}`);

      // Ejecutar git clone con timeout
      const gitCommand = `git clone --depth 1 "${repositoryUrl}" "${cloneDir}"`;
      this.logger.log(`⏳ Ejecutando comando git: ${gitCommand}`);
      
      try {
        await execAsync(gitCommand, { 
          timeout: 60000, // 60 segundos max
          maxBuffer: 5 * 1024 * 1024 
        });
        this.logger.log(`✅ Repositorio clonado exitosamente`);
      } catch (execError: any) {
        this.logger.error(`❌ Error ejecutando git: ${execError.message}`);
        
        // Limpiar el directorio en caso de error
        try {
          await fs.rm(cloneDir, { recursive: true, force: true });
        } catch {
          // Ignorar error de limpieza
        }
        
        throw new Error(`No se pudo clonar el repositorio: ${execError.message}`);
      }

      return cloneDir;
      
    } catch (error) {
      this.logger.error(`🔴 Error en cloneRepository: ${error.message}`);
      throw error;
    }
  }
}