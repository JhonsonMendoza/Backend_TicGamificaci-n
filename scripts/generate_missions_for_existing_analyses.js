/*
  Script to generate missions for existing analysis_runs that don't have missions yet.
  Usage: from backend folder:
    node scripts/generate_missions_for_existing_analyses.js
  Options:
    --dry   : do not insert, only report what would be created
    --limit N : limit number of analyses to process

  It reads DB config from backend/.env
  
  IMPORTANTE: Este script usa las REGLAS CURADAS definidas en curated-rules.ts
  Solo genera misiones para las 53 reglas educativas seleccionadas.
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// ============================================================
// REGLAS CURADAS - Solo estas reglas generarán misiones
// ============================================================
const CURATED_RULES = {
  spotbugs: [
    // HIGH
    { id: 'EI_EXPOSE_REP', severity: 'high', title: '🔓 Expones datos internos de tu clase', explanation: 'Tu getter retorna un objeto mutable (List, Date) directamente.', recommendation: 'Retorna una copia: return new ArrayList<>(this.lista);', patterns: ['ei_expose_rep', 'expose_rep', 'exposes internal representation'] },
    { id: 'EI_EXPOSE_REP2', severity: 'high', title: '🔓 Almacenas objeto externo sin copiarlo', explanation: 'Si alguien modifica el objeto que te pasaron, tus datos internos cambiarán.', recommendation: 'Copia el objeto: this.fecha = new Date(fecha.getTime());', patterns: ['ei_expose_rep2', 'expose_rep2', 'stores reference to external'] },
    { id: 'NP_NULL_ON_SOME_PATH', severity: 'high', title: '⚠️ Posible NullPointerException', explanation: 'Hay un camino en tu código donde la variable puede ser null.', recommendation: 'Agrega verificación: if (variable != null) { ... }', patterns: ['np_null_on_some_path', 'null_on_some_path', 'null dereference'] },
    { id: 'NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE', severity: 'high', title: '⚠️ Usas resultado que puede ser null', explanation: 'El método que llamas puede retornar null.', recommendation: 'Verifica el retorno antes de usar.', patterns: ['np_null_on_some_path_from_return', 'null from return', 'return value may be null'] },
    { id: 'DMI_HARDCODED_ABSOLUTE_FILENAME', severity: 'high', title: '🔴 Ruta de archivo hardcodeada', explanation: 'No funcionará en otros computadores.', recommendation: 'Usa rutas relativas o configuración.', patterns: ['dmi_hardcoded_absolute', 'hardcoded_absolute_filename', 'hardcoded file name'] },
    { id: 'SQL_INJECTION', severity: 'high', title: '🔴 ¡PELIGRO! Posible inyección SQL', explanation: 'Nunca concatenes datos del usuario en consultas SQL.', recommendation: 'Usa PreparedStatement con parámetros.', patterns: ['sql_injection', 'sql_nonconstant', 'sql injection', 'sql_prepared_statement'] },
    { id: 'XSS_REQUEST_PARAMETER_TO_SERVLET_WRITER', severity: 'high', title: '🔴 ¡PELIGRO! Posible XSS', explanation: 'No escribas datos del usuario directamente sin sanitizar.', recommendation: 'Escapa el HTML antes de mostrarlo.', patterns: ['xss_request', 'xss_servlet', 'cross-site scripting', 'xss'] },
    // MEDIUM
    { id: 'RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE', severity: 'medium', title: '🔍 Verificación null redundante', explanation: 'Esta variable nunca será null.', recommendation: 'Elimina la verificación innecesaria.', patterns: ['rcn_redundant_nullcheck', 'redundant_nullcheck', 'redundant null check'] },
    { id: 'URF_UNREAD_FIELD', severity: 'medium', title: '🔍 Campo que nunca se lee', explanation: 'Declaras este campo pero nunca lo usas.', recommendation: 'Elimina el campo o úsalo.', patterns: ['urf_unread_field', 'unread_field', 'unread field'] },
    { id: 'DLS_DEAD_LOCAL_STORE', severity: 'medium', title: '🔍 Variable asignada pero no usada', explanation: 'Asignas un valor que nunca utilizas.', recommendation: 'Elimina la variable o úsala.', patterns: ['dls_dead_local_store', 'dead_local_store', 'dead store'] },
    { id: 'UWF_FIELD_NOT_INITIALIZED_IN_CONSTRUCTOR', severity: 'medium', title: '⚠️ Campo no inicializado en constructor', explanation: 'Puede causar NullPointerException.', recommendation: 'Inicializa el campo en el constructor.', patterns: ['uwf_field_not_initialized', 'field_not_initialized', 'uninitialized field'] },
    { id: 'DM_BOXED_PRIMITIVE_FOR_PARSING', severity: 'medium', title: '💡 Ineficiencia al parsear números', explanation: 'Usa Integer.parseInt() directamente.', recommendation: 'Cambia valueOf().intValue() por parseInt().', patterns: ['dm_boxed_primitive', 'boxed_primitive_for_parsing', 'boxed primitive'] },
    { id: 'SE_BAD_FIELD', severity: 'medium', title: '⚠️ Campo no serializable en clase serializable', explanation: 'Puede causar errores al serializar.', recommendation: 'Marca el campo como transient.', patterns: ['se_bad_field', 'bad_field', 'non-serializable', 'serializable class'] },
    // LOW
    { id: 'ST_WRITE_TO_STATIC_FROM_INSTANCE_METHOD', severity: 'low', title: '💡 Escribes a variable estática desde instancia', explanation: 'Puede causar problemas en multithreading.', recommendation: 'Usa método estático o sincronización.', patterns: ['st_write_to_static', 'write_to_static', 'static from instance'] },
    { id: 'EQ_DOESNT_OVERRIDE_EQUALS', severity: 'low', title: '💡 Clase comparable sin equals()', explanation: 'Considera implementar equals() y hashCode().', recommendation: 'Implementa @Override equals() y hashCode().', patterns: ['eq_doesnt_override', 'override_equals', 'equals not overridden'] },
    { id: 'DM_NUMBER_CTOR', severity: 'low', title: '💡 Usa valueOf() en vez de new Integer()', explanation: 'Es más eficiente usar valueOf().', recommendation: 'Cambia new Integer(5) por Integer.valueOf(5).', patterns: ['dm_number_ctor', 'number_ctor', 'new integer', 'new double'] },
    { id: 'MS_SHOULD_BE_FINAL', severity: 'low', title: '💡 Campo estático debería ser final', explanation: 'Si no cambia, decláralo como static final.', recommendation: 'Agrega final al campo estático.', patterns: ['ms_should_be_final', 'should_be_final', 'should be final'] }
  ],
  pmd: [
    // HIGH
    { id: 'SystemPrintln', severity: 'high', title: '📝 No uses System.out.println()', explanation: 'En código profesional usa un Logger.', recommendation: 'Usa logger.info() en lugar de System.out.', patterns: ['systemprintln', 'system.out.println', 'system.out', 'system.err'] },
    { id: 'AvoidThrowingRawExceptionTypes', severity: 'high', title: '⚠️ No lances RuntimeException genérica', explanation: 'Crea excepciones específicas.', recommendation: 'Crea: throw new MiExcepcion("mensaje");', patterns: ['avoidthrowingrawexceptiontypes', 'raw exception', 'runtimeexception', 'throwing raw'] },
    { id: 'AvoidCatchingGenericException', severity: 'high', title: '⚠️ No captures Exception genérica', explanation: 'Captura excepciones específicas.', recommendation: 'Usa catch (IOException e) en vez de catch (Exception e).', patterns: ['avoidcatchinggenericexception', 'catching generic', 'catch exception', 'generic exception'] },
    { id: 'EmptyCatchBlock', severity: 'high', title: '🔴 ¡Bloque catch vacío!', explanation: 'Estás ignorando errores silenciosamente.', recommendation: 'Mínimo loguea: logger.error("Error", e);', patterns: ['emptycatchblock', 'empty catch', 'catch block is empty'] },
    { id: 'AvoidPrintStackTrace', severity: 'high', title: '📝 No uses printStackTrace()', explanation: 'Los logs profesionales van a archivos.', recommendation: 'Usa: logger.error("Error", exception);', patterns: ['avoidprintstacktrace', 'printstacktrace', 'print stack trace'] },
    // MEDIUM
    { id: 'CyclomaticComplexity', severity: 'medium', title: '🧩 Método muy complejo', explanation: 'Tiene demasiadas decisiones.', recommendation: 'Divide en métodos más pequeños.', patterns: ['cyclomaticcomplexity', 'cyclomatic complexity', 'too complex'] },
    { id: 'CognitiveComplexity', severity: 'medium', title: '🧠 Método difícil de entender', explanation: 'Simplifica la lógica.', recommendation: 'Divide en partes más pequeñas.', patterns: ['cognitivecomplexity', 'cognitive complexity'] },
    { id: 'NPathComplexity', severity: 'medium', title: '🔀 Demasiados caminos de ejecución', explanation: 'Difícil probar todos los casos.', recommendation: 'Simplifica condiciones.', patterns: ['npathcomplexity', 'npath complexity', 'npath'] },
    { id: 'ExcessiveMethodLength', severity: 'medium', title: '📏 Método muy largo', explanation: 'Los métodos deben hacer una sola cosa.', recommendation: 'Divide en métodos más pequeños (30-50 líneas).', patterns: ['excessivemethodlength', 'excessive method length', 'method too long'] },
    { id: 'AvoidDuplicateLiterals', severity: 'medium', title: '🔤 String repetido varias veces', explanation: 'Si cambias el texto, buscarás en varios lugares.', recommendation: 'Crea una constante: static final String SUCCESS = "success";', patterns: ['avoidduplicateliterals', 'duplicate literals', 'duplicated string'] },
    { id: 'ControlStatementBraces', severity: 'medium', title: '⚠️ If/else sin llaves', explanation: 'Siempre usa llaves para prevenir errores.', recommendation: 'Cambia: if (cond) accion(); por: if (cond) { accion(); }', patterns: ['controlstatementbraces', 'control statement braces', 'without braces', 'should have braces'] },
    { id: 'LiteralsFirstInComparisons', severity: 'medium', title: '💡 Pon el literal primero en comparaciones', explanation: 'Evita NullPointerException.', recommendation: 'Usa "texto".equals(variable).', patterns: ['literalsfirstincomparisons', 'literals first', 'yoda condition'] },
    { id: 'SimpleDateFormatNeedsLocale', severity: 'medium', title: '🌍 SimpleDateFormat sin Locale', explanation: 'Especifica idioma/región.', recommendation: 'Usa: new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())', patterns: ['simpledateformatneedslocale', 'simpledateformat locale', 'dateformat needs locale'] },
    { id: 'AvoidInstantiatingObjectsInLoops', severity: 'medium', title: '🔄 Creas objetos dentro de un loop', explanation: 'Es ineficiente.', recommendation: 'Mueve la creación fuera del loop.', patterns: ['avoidinstantiatingobjectsinloops', 'instantiating objects in loops', 'object in loop'] },
    { id: 'CloseResource', severity: 'medium', title: '🔌 Recurso no cerrado', explanation: 'Streams y conexiones deben cerrarse.', recommendation: 'Usa try-with-resources.', patterns: ['closeresource', 'close resource', 'resource not closed', 'unclosed'] },
    { id: 'UseTryWithResources', severity: 'medium', title: '🔌 Usa try-with-resources', explanation: 'Es más seguro y automático.', recommendation: 'try (FileReader fr = new FileReader(file)) { ... }', patterns: ['usetrywithresources', 'try-with-resources', 'try with resources'] },
    // LOW
    { id: 'TooManyMethods', severity: 'low', title: '📊 Clase con demasiados métodos', explanation: 'Considera dividir responsabilidades.', recommendation: 'Agrupa métodos relacionados en clases separadas.', patterns: ['toomanymethods', 'too many methods'] },
    { id: 'TooManyFields', severity: 'low', title: '📊 Clase con demasiados campos', explanation: 'La clase hace demasiadas cosas.', recommendation: 'Agrupa campos en objetos o divide la clase.', patterns: ['toomanyfields', 'too many fields'] },
    { id: 'GodClass', severity: 'low', title: '🏛️ Clase "Dios" que hace todo', explanation: 'Divide responsabilidades.', recommendation: 'Sigue el principio de responsabilidad única.', patterns: ['godclass', 'god class'] },
    { id: 'ExcessivePublicCount', severity: 'low', title: '📊 Demasiados métodos/atributos públicos', explanation: 'Revisa qué necesita ser público.', recommendation: 'Haz privados los métodos internos.', patterns: ['excessivepubliccount', 'excessive public count', 'too many public'] },
    { id: 'CouplingBetweenObjects', severity: 'low', title: '🔗 Clase depende de muchas otras', explanation: 'Alto acoplamiento dificulta mantenimiento.', recommendation: 'Usa interfaces y inyección de dependencias.', patterns: ['couplingbetweenobjects', 'coupling between objects', 'high coupling'] }
  ],
  semgrep: [
    // HIGH
    { id: 'missing-integrity', severity: 'high', title: '🔒 CDN sin verificación de integridad', explanation: 'Scripts externos pueden ser modificados.', recommendation: 'Agrega integrity="sha384-..." a scripts externos.', patterns: ['missing-integrity', 'integrity', 'subresource integrity', 'sri'] },
    { id: 'tainted-sql-string', severity: 'high', title: '🔴 ¡PELIGRO! Posible inyección SQL', explanation: 'No concatenes variables en consultas.', recommendation: 'Usa PreparedStatement con parámetros.', patterns: ['tainted-sql', 'sql-injection', 'sqli', 'sql string'] },
    { id: 'tainted-mongodb-query', severity: 'high', title: '🔴 ¡PELIGRO! Posible inyección NoSQL', explanation: 'Valida datos antes de usarlos en MongoDB.', recommendation: 'Usa librerías de validación.', patterns: ['tainted-mongodb', 'mongodb-injection', 'nosql-injection', 'nosqli'] },
    { id: 'spring-csrf-disabled', severity: 'high', title: '🔒 CSRF deshabilitado', explanation: 'Vulnerable a ataques CSRF.', recommendation: 'No deshabilites CSRF en producción.', patterns: ['csrf-disabled', 'csrf disabled', 'spring-csrf', 'disable csrf'] },
    { id: 'cors-any-origin', severity: 'high', title: '🔒 CORS permite cualquier origen (*)', explanation: 'Cualquier sitio puede hacer requests a tu API.', recommendation: 'Especifica dominios permitidos.', patterns: ['cors-any-origin', 'cors *', 'allow all origins', 'access-control-allow-origin'] },
    { id: 'weak-hash', severity: 'high', title: '🔒 Algoritmo de hash inseguro (MD5/SHA1)', explanation: 'MD5 y SHA1 están rotos.', recommendation: 'Usa SHA-256 o bcrypt para contraseñas.', patterns: ['weak-hash', 'md5', 'sha1', 'insecure hash', 'weak-hashing'] },
    { id: 'insecure-random', severity: 'high', title: '🔒 Random no criptográfico', explanation: 'java.util.Random es predecible.', recommendation: 'Usa SecureRandom para seguridad.', patterns: ['insecure-random', 'java.util.random', 'math.random', 'predictable random'] },
    { id: 'hardcoded-credentials', severity: 'high', title: '🔴 ¡ALERTA! Contraseñas en el código', explanation: 'Si subes a GitHub, todos verán tus credenciales.', recommendation: 'Usa variables de entorno: System.getenv("DB_PASSWORD")', patterns: ['hardcoded-credentials', 'hardcoded-password', 'hardcoded password', 'password =', 'hardcoded-secret'] },
    // MEDIUM
    { id: 'eqeq-is-bad', severity: 'medium', title: '⚠️ Comparas strings con ==', explanation: '== compara referencias, no contenido.', recommendation: 'Usa .equals() para comparar strings.', patterns: ['eqeq-is-bad', 'eqeq', '== string', 'string comparison'] },
    { id: 'optional-get-without-ispresent', severity: 'medium', title: '⚠️ Usas .get() sin verificar', explanation: 'Si el Optional está vacío, lanza excepción.', recommendation: 'Usa .orElse() o verifica con .isPresent().', patterns: ['optional-get-without-ispresent', 'optional.get', 'get without ispresent'] },
    { id: 'cookie-missing-httponly', severity: 'medium', title: '🔒 Cookie sin HttpOnly', explanation: 'JavaScript malicioso puede robar la cookie.', recommendation: 'Agrega: cookie.setHttpOnly(true);', patterns: ['cookie-missing-httponly', 'httponly', 'missing httponly'] },
    { id: 'cookie-missing-secure', severity: 'medium', title: '🔒 Cookie sin flag Secure', explanation: 'La cookie se envía por HTTP sin encriptar.', recommendation: 'En producción: cookie.setSecure(true);', patterns: ['cookie-missing-secure', 'missing secure', 'secure flag'] },
    { id: 'unvalidated-redirect', severity: 'medium', title: '🔒 Redirección sin validar', explanation: 'Un atacante puede redirigir a phishing.', recommendation: 'Valida URLs contra lista de dominios permitidos.', patterns: ['unvalidated-redirect', 'open redirect', 'redirect injection'] },
    // LOW
    { id: 'string-concat-in-loop', severity: 'low', title: '💡 Concatenas strings en loop', explanation: 'Concatenar con + en loops es ineficiente.', recommendation: 'Usa StringBuilder.', patterns: ['string-concat-in-loop', 'string concatenation', 'concat in loop'] },
    { id: 'useless-null-check', severity: 'low', title: '💡 Verificación null innecesaria', explanation: 'La variable ya fue verificada o nunca será null.', recommendation: 'Elimina la verificación redundante.', patterns: ['useless-null-check', 'redundant null', 'unnecessary null check'] }
  ]
};

function findMatchingRule(tool, finding) {
  const toolLower = (tool || '').toLowerCase();
  const rules = CURATED_RULES[toolLower] || [];
  
  const ruleId = (finding.ruleId || finding.rule || finding.type || finding.check_id || (finding.$ && finding.$.type) || '').toString().toLowerCase();
  const message = (finding.message || finding.description || '').toString().toLowerCase();
  const spotbugsType = ((finding.$ && finding.$.type) || finding.type || '').toString().toLowerCase();
  
  for (const rule of rules) {
    const ruleIdLower = rule.id.toLowerCase();
    
    if (ruleId === ruleIdLower || spotbugsType === ruleIdLower) {
      return rule;
    }
    
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        const patternLower = pattern.toLowerCase();
        if (ruleId.includes(patternLower) || spotbugsType.includes(patternLower) || message.includes(patternLower)) {
          return rule;
        }
      }
    }
  }
  
  return null;
}

function isRuleCurated(tool, finding) {
  return findMatchingRule(tool, finding) !== null;
}

function determineSeverity(tool, finding) {
  const rule = findMatchingRule(tool, finding);
  if (rule) return rule.severity;
  
  // Fallback to old method
  try {
    switch ((tool || '').toLowerCase()) {
      case 'spotbugs':
        const priority = finding?.$?.priority || finding?.priority;
        if (priority === '1' || priority === 1) return 'high';
        if (priority === '2' || priority === 2) return 'medium';
        return 'low';
      case 'pmd':
        const pmdPriority = finding?.priority;
        if (pmdPriority === '1' || pmdPriority === '2' || pmdPriority === 1 || pmdPriority === 2) return 'high';
        if (pmdPriority === '3' || pmdPriority === 3) return 'medium';
        return 'low';
      case 'semgrep':
        const sev = (finding?.severity || finding?.extra?.severity || '').toString().toLowerCase();
        if (sev === 'error') return 'high';
        if (sev === 'warning') return 'medium';
        return 'low';
      case 'eslint':
        const es = finding?.severity;
        if (es === 2 || es === '2') return 'high';
        if (es === 1 || es === '1') return 'medium';
        return 'low';
      default:
        return 'medium';
    }
  } catch (err) {
    return 'medium';
  }
}

function getEducationalMessage(tool, finding, severity) {
  const rule = findMatchingRule(tool, finding);
  
  if (rule) {
    const originalMessage = finding.message || finding.description || finding.rule || 'Problema detectado';
    let description = '### ¿Qué está pasando?\n\n' + rule.explanation;
    description += '\n\n### ¿Cómo arreglarlo?\n\n' + rule.recommendation;
    description += '\n\n---\n\n**🔧 Herramienta:** ' + tool.toUpperCase();
    description += '\n\n**📋 Regla:** ' + rule.id;
    description += '\n\n**📋 Mensaje técnico:** ' + originalMessage;
    
    return { title: rule.title, description, severity: rule.severity };
  }
  
  // Fallback genérico
  const originalMessage = (finding.message || finding.rule || finding.type || finding.check_id || '').toString().slice(0,120);
  const severityEmoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
  return {
    title: `${severityEmoji} ${severity.toUpperCase()} - ${tool} - ${originalMessage}`,
    description: (finding.message || finding.description || JSON.stringify(finding)).toString().slice(0,1000),
    severity
  };
}

function extractFindingsObject(findings) {
  // findings might be stored as the processed object with .results or as a raw array
  if (!findings) return {};
  if (findings.results && typeof findings.results === 'object') return findings.results;
  return findings;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const limitArgIndex = process.argv.indexOf('--limit');
  const limit = limitArgIndex >= 0 && process.argv[limitArgIndex + 1] ? parseInt(process.argv[limitArgIndex + 1]) : null;

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'analysis_user',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'analysis_db',
  });

  await client.connect();
  console.log('Connected to DB');
  console.log('📋 Usando REGLAS CURADAS: Solo se generarán misiones para las 53 reglas educativas seleccionadas.');

  try {
    // Get analyses that don't have missions
    let q = `SELECT ar.id, ar.findings FROM analysis_runs ar WHERE NOT EXISTS (SELECT 1 FROM missions m WHERE m.analysis_run_id = ar.id)`;
    if (limit) q += ` LIMIT ${limit}`;

    const res = await client.query(q);
    console.log(`Found ${res.rows.length} analyses without missions`);

    let totalCreated = 0;
    let totalFiltered = 0;
    
    for (const row of res.rows) {
      const analysisId = row.id;
      const findings = row.findings;
      const results = extractFindingsObject(findings);

      const missionsToInsert = [];

      // results might be an object where keys are tools
      if (results && typeof results === 'object') {
        for (const toolKey of Object.keys(results)) {
          try {
            const toolEntry = results[toolKey];
            // toolEntry may contain .findings or be an array
            const arr = Array.isArray(toolEntry.findings) ? toolEntry.findings : (Array.isArray(toolEntry) ? toolEntry : (toolEntry.findings || []));
            if (!Array.isArray(arr)) continue;

            for (const f of arr) {
              // ✅ FILTRAR: Solo incluir findings que correspondan a reglas curadas
              if (!isRuleCurated(toolKey, f)) {
                totalFiltered++;
                continue;
              }
              
              const filePath = f.path || f.file || f.sourcefile || f.fileName || f.filename || (f['$'] && f['$'].sourcefile) || null;
              const start = f.line || (f.start && f.start.line) || f.sourceLine?.beginline || f.startLine || null;
              const end = f.end?.line || f.sourceLine?.endline || f.endLine || null;
              const severity = determineSeverity(toolKey, f);
              const educational = getEducationalMessage(toolKey, f, severity);

              missionsToInsert.push({ 
                analysisId, 
                title: educational.title, 
                description: educational.description, 
                filePath, 
                start: start ? Number(start) : null, 
                end: end ? Number(end) : null, 
                severity: educational.severity, 
                metadata: { tool: toolKey, raw: f } 
              });
            }
          } catch (err) {
            console.warn('Error processing tool', toolKey, err.message || err);
          }
        }
      } else if (Array.isArray(results)) {
        for (const f of results) {
          const tool = f.tool || 'unknown';
          
          // ✅ FILTRAR: Solo incluir findings que correspondan a reglas curadas
          if (!isRuleCurated(tool, f)) {
            totalFiltered++;
            continue;
          }
          
          const filePath = f.path || f.file || f.sourcefile || f.fileName || f.filename || (f['$'] && f['$'].sourcefile) || null;
          const start = f.line || (f.start && f.start.line) || f.sourceLine?.beginline || f.startLine || null;
          const severity = determineSeverity(tool, f);
          const educational = getEducationalMessage(tool, f, severity);
          
          missionsToInsert.push({ 
            analysisId, 
            title: educational.title, 
            description: educational.description, 
            filePath, 
            start: start ? Number(start) : null, 
            end: null, 
            severity: educational.severity, 
            metadata: { tool, raw: f } 
          });
        }
      }

      if (missionsToInsert.length === 0) {
        console.log(`Analysis ${analysisId}: no curated missions generated`);
        continue;
      }

      console.log(`Analysis ${analysisId}: will create ${missionsToInsert.length} curated missions`);
      if (dry) {
        totalCreated += missionsToInsert.length;
        continue;
      }

      for (const m of missionsToInsert) {
        const insertQ = `INSERT INTO missions (analysis_run_id, title, description, file_path, line_start, line_end, severity, status, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,now(),now()) RETURNING id`;
        const vals = [m.analysisId, m.title, m.description, m.filePath, m.start, m.end, m.severity, JSON.stringify(m.metadata)];
        try {
          const r = await client.query(insertQ, vals);
          totalCreated += 1;
        } catch (err) {
          console.error('Error inserting mission for analysis', analysisId, err.message || err);
        }
      }
    }

    console.log('');
    console.log('========== RESUMEN ==========');
    console.log('Total missions created:', totalCreated);
    console.log('Total findings filtered (no curadas):', totalFiltered);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
