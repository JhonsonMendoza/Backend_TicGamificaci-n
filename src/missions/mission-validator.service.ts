import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CustomMission, MissionTest } from './entities/custom-mission.entity';

const execPromise = promisify(exec);

export interface ValidationResult {
  success: boolean;
  pointsAwarded: number;
  testsPassed: number;
  testsFailed: number;
  testResults: TestResult[];
  feedback: string;
  error?: string;
  compilationError?: string;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

@Injectable()
export class MissionValidatorService {
  private readonly logger = new Logger(MissionValidatorService.name);

  async validateMission(
    mission: CustomMission,
    extractedPath: string,
  ): Promise<ValidationResult> {
    this.logger.log(`Validating mission ${mission.id} at ${extractedPath}`);

    try {
      // 1. Verificar que existan las clases requeridas
      const missingClasses = await this.checkRequiredClasses(
        extractedPath,
        mission.requiredClasses,
      );
      if (missingClasses.length > 0) {
        return {
          success: false,
          pointsAwarded: 0,
          testsPassed: 0,
          testsFailed: mission.tests?.length || 0,
          testResults: [],
          feedback: `Faltan las siguientes clases: ${missingClasses.join(', ')}`,
          error: 'Missing required classes',
        };
      }

      // 2. Compilar el código Java
      const compilationResult = await this.compileJavaFiles(extractedPath);
      if (!compilationResult.success) {
        return {
          success: false,
          pointsAwarded: 0,
          testsPassed: 0,
          testsFailed: mission.tests?.length || 0,
          testResults: [],
          feedback: 'El código no compila. Revisa los errores de sintaxis.',
          compilationError: compilationResult.errors,
        };
      }

      // 3. Ejecutar tests predefinidos
      const testResults = await this.runTests(
        mission,
        extractedPath,
        compilationResult.classPath,
      );

      // 4. Calcular puntos
      const pointsAwarded = this.calculatePoints(
        mission,
        testResults.passed,
        testResults.failed,
      );

      // 5. Generar feedback
      const feedback = this.generateFeedback(
        testResults.details,
        testResults.passed,
        testResults.failed,
      );

      return {
        success: testResults.allPassed,
        pointsAwarded,
        testsPassed: testResults.passed,
        testsFailed: testResults.failed,
        testResults: testResults.details,
        feedback,
      };
    } catch (error) {
      this.logger.error(`Error validating mission: ${error.message}`, error.stack);
      return {
        success: false,
        pointsAwarded: 0,
        testsPassed: 0,
        testsFailed: mission.tests?.length || 0,
        testResults: [],
        feedback: 'Error interno al validar la misión',
        error: error.message,
      };
    }
  }

  private async checkRequiredClasses(
    extractedPath: string,
    requiredClasses: string[],
  ): Promise<string[]> {
    const missing: string[] = [];
    
    for (const className of requiredClasses) {
      const javaFile = path.join(extractedPath, `${className}.java`);
      const exists = await fs.pathExists(javaFile);
      
      if (!exists) {
        // Buscar recursivamente
        const found = await this.findJavaFile(extractedPath, className);
        if (!found) {
          missing.push(className);
        }
      }
    }
    
    return missing;
  }

  private async findJavaFile(dir: string, className: string): Promise<boolean> {
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const found = await this.findJavaFile(fullPath, className);
          if (found) return true;
        } else if (file === `${className}.java`) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async compileJavaFiles(
    extractedPath: string,
  ): Promise<{ success: boolean; errors?: string; classPath: string }> {
    try {
      // Buscar todos los archivos .java recursivamente
      const javaFiles = await this.findAllJavaFiles(extractedPath);
      
      if (javaFiles.length === 0) {
        return {
          success: false,
          errors: 'No se encontraron archivos .java',
          classPath: '',
        };
      }

      // Compilar todos los archivos
      const filesString = javaFiles.map(f => `"${f}"`).join(' ');
      const command = `javac -d "${extractedPath}" ${filesString}`;
      
      this.logger.debug(`Compiling: ${command}`);
      
      const { stdout, stderr } = await execPromise(command, {
        cwd: extractedPath,
        timeout: 30000,
      });

      if (stderr && stderr.includes('error')) {
        return { success: false, errors: stderr, classPath: '' };
      }

      return { success: true, classPath: extractedPath };
    } catch (error) {
      return {
        success: false,
        errors: error.stderr || error.message,
        classPath: '',
      };
    }
  }

  private async findAllJavaFiles(dir: string): Promise<string[]> {
    const javaFiles: string[] = [];
    
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.findAllJavaFiles(fullPath);
        javaFiles.push(...subFiles);
      } else if (file.endsWith('.java')) {
        javaFiles.push(fullPath);
      }
    }
    
    return javaFiles;
  }

  private async runTests(
    mission: CustomMission,
    extractedPath: string,
    classPath: string,
  ): Promise<{
    allPassed: boolean;
    passed: number;
    failed: number;
    details: TestResult[];
  }> {
    const tests = mission.tests || [];
    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        const result = await this.executeTest(test, extractedPath, classPath);
        results.push(result);
      } catch (error) {
        results.push({
          testName: test.name,
          passed: false,
          expected: test.expectedResult,
          actual: null,
          error: error.message,
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      allPassed: failed === 0,
      passed,
      failed,
      details: results,
    };
  }

  private async executeTest(
    test: MissionTest,
    extractedPath: string,
    classPath: string,
  ): Promise<TestResult> {
    // Crear un archivo TestRunner.java temporal que ejecute el test
    const runnerCode = this.generateTestRunnerCode(test);
    const runnerPath = path.join(extractedPath, 'TestRunner.java');
    
    await fs.writeFile(runnerPath, runnerCode);

    try {
      // Compilar el runner
      await execPromise(`javac -cp "${classPath}" "${runnerPath}"`, {
        cwd: extractedPath,
        timeout: 10000,
      });

      // Ejecutar el runner
      const { stdout, stderr } = await execPromise(
        `java -cp "${classPath}" TestRunner`,
        {
          cwd: extractedPath,
          timeout: 10000,
        },
      );

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      // Parsear resultado JSON
      const result = JSON.parse(stdout.trim());

      // Comparar resultado esperado vs actual
      const passed = this.compareResults(
        result.value,
        test.expectedResult,
        test.tolerance,
      );

      return {
        testName: test.name,
        passed,
        expected: test.expectedResult,
        actual: result.value,
      };
    } catch (error) {
      return {
        testName: test.name,
        passed: false,
        expected: test.expectedResult,
        actual: null,
        error: error.message,
      };
    } finally {
      // Limpiar archivos temporales
      await fs.remove(runnerPath).catch(() => {});
      await fs.remove(path.join(extractedPath, 'TestRunner.class')).catch(() => {});
    }
  }

  private generateTestRunnerCode(test: MissionTest): string {
    // Generar código Java que ejecute el método y retorne el resultado como JSON
    let setupCode = test.setup || `new ${test.className}()`;
    
    // Si el método es estático, no necesita instancia
    const isStatic = test.params === null || test.setup?.includes('static');
    
    let methodCall = '';
    if (isStatic) {
      methodCall = `${test.className}.${test.methodName}(${this.formatParams(test.params)})`;
    } else {
      methodCall = `instance.${test.methodName}(${this.formatParams(test.params)})`;
    }

    return `
public class TestRunner {
    public static void main(String[] args) {
        try {
            ${!isStatic ? `${test.className} instance = ${setupCode};` : ''}
            Object result = ${methodCall};
            
            // Convertir resultado a JSON simple
            String json = "{\\"value\\":" + formatValue(result) + "}";
            System.out.println(json);
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
    
    private static String formatValue(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return "\\"" + obj + "\\"";
        if (obj instanceof Double || obj instanceof Float) {
            return String.format("%.6f", ((Number)obj).doubleValue());
        }
        if (obj instanceof Number) return obj.toString();
        if (obj instanceof Boolean) return obj.toString();
        
        // Para objetos personalizados, intentar extraer valores
        try {
            if (obj.getClass().getName().equals("${test.className}")) {
                // Intentar obtener x e y si es un Vector2D u objeto similar
                java.lang.reflect.Field xField = obj.getClass().getDeclaredField("x");
                java.lang.reflect.Field yField = obj.getClass().getDeclaredField("y");
                xField.setAccessible(true);
                yField.setAccessible(true);
                double x = ((Number)xField.get(obj)).doubleValue();
                double y = ((Number)yField.get(obj)).doubleValue();
                return "{\\"x\\":" + x + ",\\"y\\":" + y + "}";
            }
        } catch (Exception e) {}
        
        return "\\"" + obj.toString() + "\\"";
    }
}
`;
  }

  private formatParams(params: any[]): string {
    if (!params || params.length === 0) return '';
    
    return params.map(p => {
      if (typeof p === 'string') return `"${p}"`;
      if (typeof p === 'object' && p.type === 'Vector2D') {
        return `new Vector2D(${p.value[0]}, ${p.value[1]})`;
      }
      return String(p);
    }).join(', ');
  }

  private compareResults(actual: any, expected: any, tolerance?: number): boolean {
    // Comparación de números con tolerancia
    if (typeof expected === 'number' && typeof actual === 'number') {
      if (tolerance) {
        return Math.abs(actual - expected) <= tolerance;
      }
      return actual === expected;
    }

    // Comparación de strings
    if (typeof expected === 'string' && typeof actual === 'string') {
      return actual === expected;
    }

    // Comparación de objetos (ej: {x: 4, y: 6})
    if (typeof expected === 'object' && typeof actual === 'object') {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);
      
      if (expectedKeys.length !== actualKeys.length) return false;
      
      for (const key of expectedKeys) {
        if (!this.compareResults(actual[key], expected[key], tolerance)) {
          return false;
        }
      }
      
      return true;
    }

    // Comparación directa
    return actual === expected;
  }

  private calculatePoints(
    mission: CustomMission,
    testsPassed: number,
    testsFailed: number,
  ): number {
    const basePoints = mission.basePoints || 0;
    const pointsPerTest = mission.pointsPerTest || 0;
    
    return basePoints + (testsPassed * pointsPerTest);
  }

  private generateFeedback(
    testResults: TestResult[],
    passed: number,
    failed: number,
  ): string {
    if (failed === 0) {
      return `¡Excelente trabajo! 🎉 Pasaste todos los ${passed} tests. Tu implementación es correcta.`;
    }

    let feedback = `Pasaste ${passed} de ${passed + failed} tests.\n\n`;
    feedback += '❌ Tests fallidos:\n';
    
    const failedTests = testResults.filter(t => !t.passed);
    for (const test of failedTests) {
      feedback += `\n- ${test.testName}\n`;
      feedback += `  Esperado: ${JSON.stringify(test.expected)}\n`;
      feedback += `  Obtenido: ${JSON.stringify(test.actual)}\n`;
      if (test.error) {
        feedback += `  Error: ${test.error}\n`;
      }
    }
    
    feedback += '\n💡 Revisa tu implementación y vuelve a intentarlo.';
    
    return feedback;
  }
}
