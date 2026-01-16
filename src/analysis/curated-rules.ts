/**
 * REGLAS CURADAS PARA PLATAFORMA GAMIFICADA EDUCATIVA
 * 
 * Este archivo contiene las 53 reglas seleccionadas para la plataforma educativa.
 * Solo estas reglas serán consideradas para generar misiones, evitando abrumar
 * a los estudiantes con demasiados errores técnicos.
 * 
 * Distribución:
 * - 🔴 HIGH (20 reglas): Críticos - Deben corregirse obligatoriamente
 * - 🟡 MEDIUM (22 reglas): Importantes - Deben corregirse para calidad
 * - 🟢 LOW (11 reglas): Sugerencias - Mejoras opcionales
 */

export interface CuratedRule {
  id: string;
  tool: 'spotbugs' | 'pmd' | 'semgrep';
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  recommendation: string;
  /** Patrones alternativos para detectar esta regla en mensajes/IDs */
  patterns?: string[];
}

/**
 * Mapa de reglas curadas indexadas por herramienta
 */
export const CURATED_RULES: Record<string, CuratedRule[]> = {
  // ============================================================
  // SPOTBUGS RULES (17 total: 7 HIGH, 6 MEDIUM, 4 LOW)
  // ============================================================
  spotbugs: [
    // === HIGH (7) ===
    {
      id: 'EI_EXPOSE_REP',
      tool: 'spotbugs',
      severity: 'high',
      title: '🔓 Expones datos internos de tu clase',
      explanation: 'Tu getter retorna un objeto mutable (List, Date) directamente. Quien lo reciba puede modificar tus datos internos.',
      recommendation: 'Retorna una copia: `return new ArrayList<>(this.lista);` o `return new Date(this.fecha.getTime());`',
      patterns: ['ei_expose_rep', 'expose_rep', 'exposes internal representation']
    },
    {
      id: 'EI_EXPOSE_REP2',
      tool: 'spotbugs',
      severity: 'high',
      title: '🔓 Almacenas objeto externo sin copiarlo',
      explanation: 'Si alguien modifica el objeto que te pasaron, tus datos internos cambiarán.',
      recommendation: 'Copia el objeto: `this.fecha = new Date(fecha.getTime());` o `this.lista = new ArrayList<>(lista);`',
      patterns: ['ei_expose_rep2', 'expose_rep2', 'stores reference to external']
    },
    {
      id: 'NP_NULL_ON_SOME_PATH',
      tool: 'spotbugs',
      severity: 'high',
      title: '⚠️ Posible NullPointerException',
      explanation: 'Hay un camino en tu código donde la variable puede ser null y causará crash.',
      recommendation: 'Agrega verificación: `if (variable != null) { variable.metodo(); }`',
      patterns: ['np_null_on_some_path', 'null_on_some_path', 'null dereference']
    },
    {
      id: 'NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE',
      tool: 'spotbugs',
      severity: 'high',
      title: '⚠️ Usas resultado que puede ser null',
      explanation: 'El método que llamas puede retornar null, verifica antes de usar.',
      recommendation: 'Verifica el retorno: `String result = metodo(); if (result != null) { ... }`',
      patterns: ['np_null_on_some_path_from_return', 'null from return', 'return value may be null']
    },
    {
      id: 'DMI_HARDCODED_ABSOLUTE_FILENAME',
      tool: 'spotbugs',
      severity: 'high',
      title: '🔴 Ruta de archivo hardcodeada',
      explanation: 'No funcionará en otros computadores. Usa rutas relativas o configuración.',
      recommendation: 'Usa configuración: `String path = System.getProperty("user.home") + "/archivo";` o variables de entorno.',
      patterns: ['dmi_hardcoded_absolute', 'hardcoded_absolute_filename', 'hardcoded file name']
    },
    {
      id: 'SQL_INJECTION',
      tool: 'spotbugs',
      severity: 'high',
      title: '🔴 ¡PELIGRO! Posible inyección SQL',
      explanation: 'Nunca concatenes datos del usuario en consultas SQL. Un atacante puede ejecutar comandos maliciosos.',
      recommendation: 'Usa PreparedStatement: ps.setString(1, usuario); NUNCA concatenar strings en SQL.',
      patterns: ['sql_injection', 'sql_nonconstant', 'sql injection', 'sql_prepared_statement']
    },
    {
      id: 'XSS_REQUEST_PARAMETER_TO_SERVLET_WRITER',
      tool: 'spotbugs',
      severity: 'high',
      title: '🔴 ¡PELIGRO! Posible XSS',
      explanation: 'No escribas datos del usuario directamente en la respuesta sin sanitizar.',
      recommendation: 'Escapa el HTML: usa StringEscapeUtils.escapeHtml4(input) o un framework que lo haga automáticamente.',
      patterns: ['xss_request', 'xss_servlet', 'cross-site scripting', 'xss']
    },
    // === MEDIUM (6) ===
    {
      id: 'RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE',
      tool: 'spotbugs',
      severity: 'medium',
      title: '🔍 Verificación null redundante',
      explanation: 'Esta variable nunca será null, puedes eliminar la verificación.',
      recommendation: 'Elimina el `if (variable != null)` si la variable siempre tiene valor.',
      patterns: ['rcn_redundant_nullcheck', 'redundant_nullcheck', 'redundant null check']
    },
    {
      id: 'URF_UNREAD_FIELD',
      tool: 'spotbugs',
      severity: 'medium',
      title: '🔍 Campo que nunca se lee',
      explanation: 'Declaras este campo pero nunca lo usas. ¿Sobra?',
      recommendation: 'Elimina el campo si no lo necesitas, o úsalo donde corresponda.',
      patterns: ['urf_unread_field', 'unread_field', 'unread field']
    },
    {
      id: 'DLS_DEAD_LOCAL_STORE',
      tool: 'spotbugs',
      severity: 'medium',
      title: '🔍 Variable asignada pero no usada',
      explanation: 'Asignas un valor que nunca utilizas después.',
      recommendation: 'Elimina la variable o úsala. Si es temporal, comenta por qué está ahí.',
      patterns: ['dls_dead_local_store', 'dead_local_store', 'dead store']
    },
    {
      id: 'UWF_FIELD_NOT_INITIALIZED_IN_CONSTRUCTOR',
      tool: 'spotbugs',
      severity: 'medium',
      title: '⚠️ Campo no inicializado en constructor',
      explanation: 'Puede causar NullPointerException si se usa antes de asignarle valor.',
      recommendation: 'Inicializa el campo en el constructor o al declararlo: `private String nombre = "";`',
      patterns: ['uwf_field_not_initialized', 'field_not_initialized', 'uninitialized field']
    },
    {
      id: 'DM_BOXED_PRIMITIVE_FOR_PARSING',
      tool: 'spotbugs',
      severity: 'medium',
      title: '💡 Ineficiencia al parsear números',
      explanation: 'Usa Integer.parseInt() en vez de Integer.valueOf().intValue().',
      recommendation: 'Cambia `Integer.valueOf(str).intValue()` por `Integer.parseInt(str)`',
      patterns: ['dm_boxed_primitive', 'boxed_primitive_for_parsing', 'boxed primitive']
    },
    {
      id: 'SE_BAD_FIELD',
      tool: 'spotbugs',
      severity: 'medium',
      title: '⚠️ Campo no serializable en clase serializable',
      explanation: 'Puede causar errores al serializar objetos de esta clase.',
      recommendation: 'Marca el campo como `transient` si no necesitas serializarlo, o haz que su tipo sea Serializable.',
      patterns: ['se_bad_field', 'bad_field', 'non-serializable', 'serializable class']
    },
    // === LOW (4) ===
    {
      id: 'ST_WRITE_TO_STATIC_FROM_INSTANCE_METHOD',
      tool: 'spotbugs',
      severity: 'low',
      title: '💡 Escribes a variable estática desde método de instancia',
      explanation: 'Puede causar problemas en multithreading.',
      recommendation: 'Considera usar un método estático o sincronizar el acceso.',
      patterns: ['st_write_to_static', 'write_to_static', 'static from instance']
    },
    {
      id: 'EQ_DOESNT_OVERRIDE_EQUALS',
      tool: 'spotbugs',
      severity: 'low',
      title: '💡 Clase comparable sin equals()',
      explanation: 'Si comparas objetos de esta clase, considera implementar equals() y hashCode().',
      recommendation: 'Implementa: `@Override public boolean equals(Object o) { ... }` y `@Override public int hashCode() { ... }`',
      patterns: ['eq_doesnt_override', 'override_equals', 'equals not overridden']
    },
    {
      id: 'DM_NUMBER_CTOR',
      tool: 'spotbugs',
      severity: 'low',
      title: '💡 Usa valueOf() en vez de new Integer()',
      explanation: 'Es más eficiente: Integer.valueOf(5) en vez de new Integer(5).',
      recommendation: 'Cambia `new Integer(5)` por `Integer.valueOf(5)` o simplemente `5` (autoboxing).',
      patterns: ['dm_number_ctor', 'number_ctor', 'new integer', 'new double']
    },
    {
      id: 'MS_SHOULD_BE_FINAL',
      tool: 'spotbugs',
      severity: 'low',
      title: '💡 Campo estático debería ser final',
      explanation: 'Si no cambia, decláralo como static final.',
      recommendation: 'Cambia `static String NOMBRE` por `static final String NOMBRE`',
      patterns: ['ms_should_be_final', 'should_be_final', 'should be final']
    }
  ],

  // ============================================================
  // PMD RULES (21 total: 5 HIGH, 11 MEDIUM, 5 LOW)
  // ============================================================
  pmd: [
    // === HIGH (5) ===
    {
      id: 'SystemPrintln',
      tool: 'pmd',
      severity: 'high',
      title: '📝 No uses System.out.println() en código profesional',
      explanation: 'System.out.println() está bien para aprender, pero en código real debes usar un Logger como SLF4J o Log4j.',
      recommendation: 'Usa: `logger.info("Mi mensaje");` en lugar de `System.out.println("Mi mensaje");`',
      patterns: ['systemprintln', 'system.out.println', 'system.out', 'system.err']
    },
    {
      id: 'AvoidThrowingRawExceptionTypes',
      tool: 'pmd',
      severity: 'high',
      title: '⚠️ No lances RuntimeException genérica',
      explanation: 'Crea excepciones específicas como PedidoNotFoundException para que el código que las capture sepa qué pasó.',
      recommendation: 'Crea: `throw new PedidoNotFoundException("Pedido #123 no existe");` en vez de `throw new RuntimeException("Error")`',
      patterns: ['avoidthrowingrawexceptiontypes', 'raw exception', 'runtimeexception', 'throwing raw']
    },
    {
      id: 'AvoidCatchingGenericException',
      tool: 'pmd',
      severity: 'high',
      title: '⚠️ No captures Exception genérica',
      explanation: 'Captura excepciones específicas para manejarlas correctamente.',
      recommendation: 'Usa: `catch (IOException e)` en vez de `catch (Exception e)` para saber exactamente qué falló.',
      patterns: ['avoidcatchinggenericexception', 'catching generic', 'catch exception', 'generic exception']
    },
    {
      id: 'EmptyCatchBlock',
      tool: 'pmd',
      severity: 'high',
      title: '🔴 ¡Bloque catch vacío!',
      explanation: 'Estás ignorando errores silenciosamente. Al menos registra el error con un logger.',
      recommendation: 'Mínimo loguea: `catch (Exception e) { logger.error("Error procesando: ", e); }`',
      patterns: ['emptycatchblock', 'empty catch', 'catch block is empty']
    },
    {
      id: 'AvoidPrintStackTrace',
      tool: 'pmd',
      severity: 'high',
      title: '📝 No uses printStackTrace()',
      explanation: 'printStackTrace() imprime a consola que no siempre es visible. Los logs profesionales van a archivos.',
      recommendation: 'Usa: `logger.error("Error en proceso", exception);`',
      patterns: ['avoidprintstacktrace', 'printstacktrace', 'print stack trace']
    },
    // === MEDIUM (11) ===
    {
      id: 'CyclomaticComplexity',
      tool: 'pmd',
      severity: 'medium',
      title: '🧩 Método muy complejo',
      explanation: 'Tiene demasiadas decisiones (if/else/switch). Divide en métodos más pequeños.',
      recommendation: 'Extrae bloques de código a métodos separados con nombres descriptivos.',
      patterns: ['cyclomaticcomplexity', 'cyclomatic complexity', 'too complex']
    },
    {
      id: 'CognitiveComplexity',
      tool: 'pmd',
      severity: 'medium',
      title: '🧠 Método difícil de entender',
      explanation: 'Simplifica la lógica o divide en partes más pequeñas.',
      recommendation: 'Separa la lógica en métodos con nombres que expliquen qué hacen.',
      patterns: ['cognitivecomplexity', 'cognitive complexity']
    },
    {
      id: 'NPathComplexity',
      tool: 'pmd',
      severity: 'medium',
      title: '🔀 Demasiados caminos de ejecución',
      explanation: 'Tu método tiene tantas combinaciones que es difícil probar todos los casos.',
      recommendation: 'Simplifica condiciones o divide en métodos más pequeños.',
      patterns: ['npathcomplexity', 'npath complexity', 'npath']
    },
    {
      id: 'ExcessiveMethodLength',
      tool: 'pmd',
      severity: 'medium',
      title: '📏 Método muy largo',
      explanation: 'Los métodos deben hacer una sola cosa. Divide en métodos más pequeños.',
      recommendation: 'Un método no debería tener más de 30-50 líneas. Extrae lógica a métodos auxiliares.',
      patterns: ['excessivemethodlength', 'excessive method length', 'method too long']
    },
    {
      id: 'AvoidDuplicateLiterals',
      tool: 'pmd',
      severity: 'medium',
      title: '🔤 String repetido varias veces',
      explanation: 'Si cambias el texto, tendrás que buscarlo en varios lugares.',
      recommendation: 'Crea una constante: `private static final String SUCCESS = "success";`',
      patterns: ['avoidduplicateliterals', 'duplicate literals', 'duplicated string']
    },
    {
      id: 'ControlStatementBraces',
      tool: 'pmd',
      severity: 'medium',
      title: '⚠️ If/else sin llaves',
      explanation: 'Siempre usa llaves {} aunque sea una línea. Previene errores cuando agregas más código.',
      recommendation: 'Cambia: `if (cond) accion();` por: `if (cond) { accion(); }`',
      patterns: ['controlstatementbraces', 'control statement braces', 'without braces', 'should have braces']
    },
    {
      id: 'LiteralsFirstInComparisons',
      tool: 'pmd',
      severity: 'medium',
      title: '💡 Pon el literal primero en comparaciones',
      explanation: 'Evita NullPointerException poniendo el string literal primero.',
      recommendation: 'Usa `"texto".equals(variable)` en vez de `variable.equals("texto")`',
      patterns: ['literalsfirstincomparisons', 'literals first', 'yoda condition']
    },
    {
      id: 'SimpleDateFormatNeedsLocale',
      tool: 'pmd',
      severity: 'medium',
      title: '🌍 SimpleDateFormat sin Locale',
      explanation: 'Especifica el idioma/región para formato consistente en diferentes países.',
      recommendation: 'Usa: `new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())`',
      patterns: ['simpledateformatneedslocale', 'simpledateformat locale', 'dateformat needs locale']
    },
    {
      id: 'AvoidInstantiatingObjectsInLoops',
      tool: 'pmd',
      severity: 'medium',
      title: '🔄 Creas objetos dentro de un loop',
      explanation: 'Es ineficiente, intenta crearlos fuera si es posible.',
      recommendation: 'Mueve la creación del objeto fuera del loop si el mismo objeto puede reutilizarse.',
      patterns: ['avoidinstantiatingobjectsinloops', 'instantiating objects in loops', 'object in loop']
    },
    {
      id: 'CloseResource',
      tool: 'pmd',
      severity: 'medium',
      title: '🔌 Recurso no cerrado',
      explanation: 'Streams, conexiones y archivos deben cerrarse. Causa memory leaks.',
      recommendation: 'Usa try-with-resources: `try (FileReader fr = new FileReader(file)) { ... }`',
      patterns: ['closeresource', 'close resource', 'resource not closed', 'unclosed']
    },
    {
      id: 'UseTryWithResources',
      tool: 'pmd',
      severity: 'medium',
      title: '🔌 Usa try-with-resources',
      explanation: 'Es más seguro y el recurso se cierra automáticamente.',
      recommendation: 'Cambia a: `try (FileReader fr = new FileReader(file)) { ... }`',
      patterns: ['usetrywithresources', 'try-with-resources', 'try with resources']
    },
    // === LOW (5) ===
    {
      id: 'TooManyMethods',
      tool: 'pmd',
      severity: 'low',
      title: '📊 Clase con demasiados métodos',
      explanation: 'Considera dividir responsabilidades en varias clases.',
      recommendation: 'Agrupa métodos relacionados en clases separadas (principio de responsabilidad única).',
      patterns: ['toomanymethods', 'too many methods']
    },
    {
      id: 'TooManyFields',
      tool: 'pmd',
      severity: 'low',
      title: '📊 Clase con demasiados campos',
      explanation: 'Puede indicar que la clase hace demasiadas cosas.',
      recommendation: 'Agrupa campos relacionados en objetos o divide la clase.',
      patterns: ['toomanyfields', 'too many fields']
    },
    {
      id: 'GodClass',
      tool: 'pmd',
      severity: 'low',
      title: '🏛️ Clase "Dios" que hace todo',
      explanation: 'Divide responsabilidades siguiendo el principio de responsabilidad única.',
      recommendation: 'Extrae funcionalidades a clases más pequeñas y enfocadas.',
      patterns: ['godclass', 'god class']
    },
    {
      id: 'ExcessivePublicCount',
      tool: 'pmd',
      severity: 'low',
      title: '📊 Demasiados métodos/atributos públicos',
      explanation: 'Considera qué realmente necesita ser público.',
      recommendation: 'Haz privados los métodos que solo se usan internamente.',
      patterns: ['excessivepubliccount', 'excessive public count', 'too many public']
    },
    {
      id: 'CouplingBetweenObjects',
      tool: 'pmd',
      severity: 'low',
      title: '🔗 Clase depende de muchas otras',
      explanation: 'Alto acoplamiento dificulta mantenimiento y testing.',
      recommendation: 'Usa interfaces y inyección de dependencias para reducir acoplamiento.',
      patterns: ['couplingbetweenobjects', 'coupling between objects', 'high coupling']
    }
  ],

  // ============================================================
  // SEMGREP RULES (15 total: 8 HIGH, 5 MEDIUM, 2 LOW)
  // ============================================================
  semgrep: [
    // === HIGH (8) ===
    {
      id: 'missing-integrity',
      tool: 'semgrep',
      severity: 'high',
      title: '🔒 CDN sin verificación de integridad',
      explanation: 'Los scripts/estilos de CDN pueden ser modificados maliciosamente.',
      recommendation: 'Agrega `integrity="sha384-..."` y `crossorigin="anonymous"` a scripts/estilos externos.',
      patterns: ['missing-integrity', 'integrity', 'subresource integrity', 'sri']
    },
    {
      id: 'tainted-sql-string',
      tool: 'semgrep',
      severity: 'high',
      title: '🔴 ¡PELIGRO! Posible inyección SQL',
      explanation: 'No concatenes variables en consultas. Un atacante puede ejecutar comandos maliciosos.',
      recommendation: 'Usa PreparedStatement: `stmt.setString(1, valor);`',
      patterns: ['tainted-sql', 'sql-injection', 'sqli', 'sql string']
    },
    {
      id: 'tainted-mongodb-query',
      tool: 'semgrep',
      severity: 'high',
      title: '🔴 ¡PELIGRO! Posible inyección NoSQL',
      explanation: 'Valida y sanitiza los datos antes de usarlos en consultas MongoDB.',
      recommendation: 'Usa librerías de validación y nunca construyas queries con concatenación de strings.',
      patterns: ['tainted-mongodb', 'mongodb-injection', 'nosql-injection', 'nosqli']
    },
    {
      id: 'spring-csrf-disabled',
      tool: 'semgrep',
      severity: 'high',
      title: '🔒 CSRF deshabilitado',
      explanation: 'Tu aplicación es vulnerable a ataques Cross-Site Request Forgery.',
      recommendation: 'No deshabilites CSRF: elimina `.csrf().disable()` de tu configuración de Spring Security.',
      patterns: ['csrf-disabled', 'csrf disabled', 'spring-csrf', 'disable csrf']
    },
    {
      id: 'cors-any-origin',
      tool: 'semgrep',
      severity: 'high',
      title: '🔒 CORS permite cualquier origen (*)',
      explanation: 'En producción, cualquier sitio web podría hacer requests a tu API.',
      recommendation: 'Especifica dominios permitidos: `allowedOrigins("https://tudominio.com")`',
      patterns: ['cors-any-origin', 'cors *', 'allow all origins', 'access-control-allow-origin']
    },
    {
      id: 'weak-hash',
      tool: 'semgrep',
      severity: 'high',
      title: '🔒 Algoritmo de hash inseguro (MD5/SHA1)',
      explanation: 'MD5 y SHA1 están rotos. No los uses para seguridad.',
      recommendation: 'Usa SHA-256 para hashes generales, o bcrypt/Argon2 para contraseñas.',
      patterns: ['weak-hash', 'md5', 'sha1', 'insecure hash', 'weak-hashing']
    },
    {
      id: 'insecure-random',
      tool: 'semgrep',
      severity: 'high',
      title: '🔒 Random no criptográfico',
      explanation: 'java.util.Random es predecible. Para seguridad, usa SecureRandom.',
      recommendation: 'Usa: `SecureRandom random = new SecureRandom();` para tokens, passwords, etc.',
      patterns: ['insecure-random', 'java.util.random', 'math.random', 'predictable random']
    },
    {
      id: 'hardcoded-credentials',
      tool: 'semgrep',
      severity: 'high',
      title: '🔴 ¡ALERTA! Contraseñas en el código',
      explanation: 'Si subes a GitHub, cualquiera verá tus credenciales.',
      recommendation: 'Usa variables de entorno: `String password = System.getenv("DB_PASSWORD");`',
      patterns: ['hardcoded-credentials', 'hardcoded-password', 'hardcoded password', 'password =', 'hardcoded-secret']
    },
    // === MEDIUM (5) ===
    {
      id: 'eqeq-is-bad',
      tool: 'semgrep',
      severity: 'medium',
      title: '⚠️ Comparas strings con ==',
      explanation: '== compara referencias, no contenido. Puede dar resultados inesperados.',
      recommendation: 'Usa `.equals()` para comparar strings: `"texto".equals(variable)`',
      patterns: ['eqeq-is-bad', 'eqeq', '== string', 'string comparison']
    },
    {
      id: 'optional-get-without-ispresent',
      tool: 'semgrep',
      severity: 'medium',
      title: '⚠️ Usas .get() sin verificar',
      explanation: 'Si el Optional está vacío, .get() lanza excepción.',
      recommendation: 'Usa: `optional.orElse(valorDefault)` o verifica con `if (optional.isPresent())`',
      patterns: ['optional-get-without-ispresent', 'optional.get', 'get without ispresent']
    },
    {
      id: 'cookie-missing-httponly',
      tool: 'semgrep',
      severity: 'medium',
      title: '🔒 Cookie sin HttpOnly',
      explanation: 'Sin HttpOnly, JavaScript malicioso puede robar la cookie.',
      recommendation: 'Agrega: `cookie.setHttpOnly(true);`',
      patterns: ['cookie-missing-httponly', 'httponly', 'missing httponly']
    },
    {
      id: 'cookie-missing-secure',
      tool: 'semgrep',
      severity: 'medium',
      title: '🔒 Cookie sin flag Secure',
      explanation: 'Sin Secure, la cookie se envía por HTTP no encriptado.',
      recommendation: 'En producción: `cookie.setSecure(true);` para enviar solo por HTTPS.',
      patterns: ['cookie-missing-secure', 'missing secure', 'secure flag']
    },
    {
      id: 'unvalidated-redirect',
      tool: 'semgrep',
      severity: 'medium',
      title: '🔒 Redirección sin validar',
      explanation: 'Un atacante puede redirigir usuarios a sitios de phishing.',
      recommendation: 'Valida las URLs contra una lista de dominios permitidos antes de redirigir.',
      patterns: ['unvalidated-redirect', 'open redirect', 'redirect injection']
    },
    // === LOW (2) ===
    {
      id: 'string-concat-in-loop',
      tool: 'semgrep',
      severity: 'low',
      title: '💡 Concatenas strings en loop',
      explanation: 'Concatenar con + en loops es muy ineficiente.',
      recommendation: 'Usa StringBuilder: `StringBuilder sb = new StringBuilder(); sb.append(texto);`',
      patterns: ['string-concat-in-loop', 'string concatenation', 'concat in loop']
    },
    {
      id: 'useless-null-check',
      tool: 'semgrep',
      severity: 'low',
      title: '💡 Verificación null innecesaria',
      explanation: 'Esta variable ya fue verificada o nunca será null.',
      recommendation: 'Elimina la verificación redundante para código más limpio.',
      patterns: ['useless-null-check', 'redundant null', 'unnecessary null check']
    }
  ]
};

/**
 * Obtiene todas las reglas curadas como un array plano
 */
export function getAllCuratedRules(): CuratedRule[] {
  return [
    ...CURATED_RULES.spotbugs,
    ...CURATED_RULES.pmd,
    ...CURATED_RULES.semgrep
  ];
}

/**
 * Busca una regla curada que coincida con el finding
 * @param tool Herramienta que generó el finding
 * @param finding El finding a buscar
 * @returns La regla curada si existe, null si no
 */
export function findMatchingCuratedRule(tool: string, finding: any): CuratedRule | null {
  const toolLower = tool.toLowerCase();
  const rules = CURATED_RULES[toolLower] || [];
  
  // Extraer información del finding para buscar coincidencias
  const ruleId = (
    finding.ruleId || 
    finding.rule || 
    finding.type || 
    finding.check_id || 
    finding.$?.type || 
    finding.$.type ||
    ''
  ).toString().toLowerCase();
  
  const message = (
    finding.message || 
    finding.description || 
    ''
  ).toString().toLowerCase();
  
  // Para SpotBugs, el tipo puede venir en diferentes formatos
  const spotbugsType = (finding.$?.type || finding.type || '').toString().toLowerCase();
  
  // Buscar coincidencia
  for (const rule of rules) {
    const ruleIdLower = rule.id.toLowerCase();
    
    // Coincidencia directa por ID
    if (ruleId === ruleIdLower || spotbugsType === ruleIdLower) {
      return rule;
    }
    
    // Buscar en patrones
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        const patternLower = pattern.toLowerCase();
        if (
          ruleId.includes(patternLower) || 
          spotbugsType.includes(patternLower) ||
          message.includes(patternLower)
        ) {
          return rule;
        }
      }
    }
  }
  
  return null;
}

/**
 * Verifica si un finding corresponde a una regla curada
 */
export function isRuleCurated(tool: string, finding: any): boolean {
  return findMatchingCuratedRule(tool, finding) !== null;
}

/**
 * Obtiene el mensaje educativo para un finding basado en reglas curadas
 */
export function getEducationalMessage(tool: string, finding: any): { title: string; description: string; severity: 'high' | 'medium' | 'low' } | null {
  const rule = findMatchingCuratedRule(tool, finding);
  
  if (!rule) {
    return null;
  }
  
  const originalMessage = finding.message || finding.description || finding.rule || finding.type || finding.check_id || 'Problema detectado';
  
  // Construir descripción educativa
  let description = '### ¿Qué está pasando?\n\n' + rule.explanation;
  description += '\n\n### ¿Cómo arreglarlo?\n\n' + rule.recommendation;
  description += '\n\n---\n\n**🔧 Herramienta:** ' + tool.toUpperCase();
  description += '\n\n**📋 Regla:** ' + rule.id;
  description += '\n\n**📋 Mensaje técnico:** ' + originalMessage;
  
  return {
    title: rule.title,
    description,
    severity: rule.severity
  };
}

/**
 * Estadísticas de las reglas curadas
 */
export const CURATED_RULES_STATS = {
  total: getAllCuratedRules().length,
  byTool: {
    spotbugs: CURATED_RULES.spotbugs.length,
    pmd: CURATED_RULES.pmd.length,
    semgrep: CURATED_RULES.semgrep.length
  },
  bySeverity: {
    high: getAllCuratedRules().filter(r => r.severity === 'high').length,
    medium: getAllCuratedRules().filter(r => r.severity === 'medium').length,
    low: getAllCuratedRules().filter(r => r.severity === 'low').length
  }
};
