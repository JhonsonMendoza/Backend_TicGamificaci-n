-- Script para poblar la tabla custom_missions con las 15 misiones (3 por materia)
-- Ejecutar después de que TypeORM cree las tablas

-- CÁLCULO VECTORIAL

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Suma de Vectores 2D',
  E'Implementa una clase Vector2D con operaciones básicas.\n\nRequisitos:\n- Constructor que reciba x, y\n- Método sumar(Vector2D otro) que retorne un nuevo Vector2D\n- Método magnitud() que retorne la magnitud del vector',
  'calculus',
  'easy',
  30,
  20,
  ARRAY['Vector2D'],
  ARRAY['sumar', 'magnitud'],
  '[
    {
      "name": "Test magnitud de (3,4)",
      "className": "Vector2D",
      "methodName": "magnitud",
      "params": [],
      "expectedResult": 5.0,
      "tolerance": 0.01,
      "setup": "new Vector2D(3, 4)"
    },
    {
      "name": "Test magnitud de (0,0)",
      "className": "Vector2D",
      "methodName": "magnitud",
      "params": [],
      "expectedResult": 0.0,
      "tolerance": 0.01,
      "setup": "new Vector2D(0, 0)"
    },
    {
      "name": "Test suma (1,2) + (3,4)",
      "className": "Vector2D",
      "methodName": "sumar",
      "params": [{"type": "Vector2D", "value": [3, 4]}],
      "expectedResult": {"x": 4, "y": 6},
      "setup": "new Vector2D(1, 2)"
    }
  ]'::json,
  'Verifica que la magnitud use la fórmula sqrt(x² + y²) y que la suma retorne un nuevo vector.',
  true,
  1,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Producto Punto de Vectores',
  E'Extiende la clase Vector2D con más operaciones.\n\nRequisitos:\n- Método productoPunto(Vector2D otro) que retorne el producto punto\n- Método anguloEntre(Vector2D otro) que retorne el ángulo en radianes',
  'calculus',
  'medium',
  40,
  30,
  ARRAY['Vector2D'],
  ARRAY['productoPunto', 'anguloEntre'],
  '[
    {
      "name": "Test producto punto perpendiculares",
      "className": "Vector2D",
      "methodName": "productoPunto",
      "params": [{"type": "Vector2D", "value": [0, 1]}],
      "expectedResult": 0.0,
      "tolerance": 0.01,
      "setup": "new Vector2D(1, 0)"
    },
    {
      "name": "Test producto punto paralelos",
      "className": "Vector2D",
      "methodName": "productoPunto",
      "params": [{"type": "Vector2D", "value": [1, 0]}],
      "expectedResult": 1.0,
      "tolerance": 0.01,
      "setup": "new Vector2D(1, 0)"
    }
  ]'::json,
  'El producto punto es x1*x2 + y1*y2. El ángulo usa arccos(productoPunto / (magnitud1 * magnitud2)).',
  true,
  2,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Normalización de Vectores',
  E'Implementa la normalización de vectores.\n\nRequisitos:\n- Método normalizar() que retorne un vector unitario en la misma dirección',
  'calculus',
  'easy',
  30,
  25,
  ARRAY['Vector2D'],
  ARRAY['normalizar'],
  '[
    {
      "name": "Test normalizar (3,4)",
      "className": "Vector2D",
      "methodName": "normalizar",
      "params": [],
      "expectedResult": {"x": 0.6, "y": 0.8},
      "tolerance": 0.01,
      "setup": "new Vector2D(3, 4)"
    }
  ]'::json,
  'Un vector normalizado tiene magnitud 1 y apunta en la misma dirección.',
  true,
  3,
  NOW(),
  NOW()
);

-- FÍSICA I

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Calculadora de Caída Libre',
  E'Implementa cálculos de caída libre.\n\nRequisitos:\n- Método static velocidadFinal(double alturaInicial) - retorna velocidad final en m/s\n- Método static tiempoCaida(double alturaInicial) - retorna tiempo en segundos\nUsa g = 9.8 m/s²',
  'physics',
  'easy',
  30,
  20,
  ARRAY['CaidaLibre'],
  ARRAY['velocidadFinal', 'tiempoCaida'],
  '[
    {
      "name": "Test velocidad final desde 100m",
      "className": "CaidaLibre",
      "methodName": "velocidadFinal",
      "params": [100],
      "expectedResult": 44.27,
      "tolerance": 0.1
    },
    {
      "name": "Test tiempo de caída desde 100m",
      "className": "CaidaLibre",
      "methodName": "tiempoCaida",
      "params": [100],
      "expectedResult": 4.52,
      "tolerance": 0.1
    },
    {
      "name": "Test velocidad final desde 0m",
      "className": "CaidaLibre",
      "methodName": "velocidadFinal",
      "params": [0],
      "expectedResult": 0.0,
      "tolerance": 0.01
    }
  ]'::json,
  'Usa v = sqrt(2*g*h) y t = sqrt(2*h/g)',
  true,
  4,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Calculadora de Fuerzas 1D',
  E'Implementa cálculos de fuerza neta y aceleración.\n\nRequisitos:\n- Método static fuerzaNeta(double[] fuerzas) - suma las fuerzas\n- Método static aceleracion(double fuerzaNeta, double masa) - calcula a = F/m',
  'physics',
  'easy',
  30,
  20,
  ARRAY['Fuerzas'],
  ARRAY['fuerzaNeta', 'aceleracion'],
  '[
    {
      "name": "Test fuerza neta [10, -5, 20]",
      "className": "Fuerzas",
      "methodName": "fuerzaNeta",
      "params": [[10.0, -5.0, 20.0]],
      "expectedResult": 25.0,
      "tolerance": 0.01
    },
    {
      "name": "Test aceleración F=50, m=10",
      "className": "Fuerzas",
      "methodName": "aceleracion",
      "params": [50.0, 10.0],
      "expectedResult": 5.0,
      "tolerance": 0.01
    }
  ]'::json,
  'La fuerza neta es la suma algebraica. La aceleración es F/m.',
  true,
  5,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Energía Cinética',
  E'Calcula la energía cinética de un objeto.\n\nRequisitos:\n- Método static energiaCinetica(double masa, double velocidad)\nFórmula: Ec = 0.5 * m * v²',
  'physics',
  'easy',
  25,
  25,
  ARRAY['Energia'],
  ARRAY['energiaCinetica'],
  '[
    {
      "name": "Test Ec con m=10, v=5",
      "className": "Energia",
      "methodName": "energiaCinetica",
      "params": [10.0, 5.0],
      "expectedResult": 125.0,
      "tolerance": 0.01
    },
    {
      "name": "Test Ec con m=0",
      "className": "Energia",
      "methodName": "energiaCinetica",
      "params": [0.0, 10.0],
      "expectedResult": 0.0,
      "tolerance": 0.01
    }
  ]'::json,
  'Usa la fórmula Ec = 0.5 * masa * velocidad²',
  true,
  6,
  NOW(),
  NOW()
);

-- ECUACIONES DIFERENCIALES

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Método de Euler - Un Paso',
  E'Implementa un paso del método de Euler.\n\nRequisitos:\n- Método static unPasoEuler(double x0, double y0, double h, función f)\nFórmula: y1 = y0 + h * f(x0, y0)',
  'differential',
  'medium',
  40,
  30,
  ARRAY['MetodoEuler'],
  ARRAY['unPasoEuler'],
  '[
    {
      "name": "Test dy/dx = x, desde (0,0), h=0.1",
      "className": "MetodoEuler",
      "methodName": "unPasoEuler",
      "params": [0.0, 0.0, 0.1],
      "expectedResult": 0.0,
      "tolerance": 0.01
    }
  ]'::json,
  'Aplica la fórmula de Euler: y_nuevo = y_actual + h * derivada',
  true,
  7,
  NOW(),
  NOW()
);

-- Continuará con más misiones...
-- COMPUTACIÓN DIGITAL

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Suma de Números Binarios',
  E'Suma dos números binarios representados como strings.\n\nRequisitos:\n- Método static sumarBinarios(String a, String b)\n- NO uses Integer.parseInt(x, 2)',
  'digital',
  'medium',
  40,
  30,
  ARRAY['Binario'],
  ARRAY['sumarBinarios'],
  '[
    {
      "name": "Test 101 + 11",
      "className": "Binario",
      "methodName": "sumarBinarios",
      "params": ["101", "11"],
      "expectedResult": "1000",
      "tolerance": null
    },
    {
      "name": "Test 1111 + 1",
      "className": "Binario",
      "methodName": "sumarBinarios",
      "params": ["1111", "1"],
      "expectedResult": "10000",
      "tolerance": null
    }
  ]'::json,
  'Implementa la suma bit a bit con acarreo',
  true,
  10,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Decimal a Binario',
  E'Convierte un número decimal a binario.\n\nRequisitos:\n- Método static decimalABinario(int decimal)\n- NO uses Integer.toBinaryString()',
  'digital',
  'easy',
  30,
  25,
  ARRAY['Conversor'],
  ARRAY['decimalABinario'],
  '[
    {
      "name": "Test 10 a binario",
      "className": "Conversor",
      "methodName": "decimalABinario",
      "params": [10],
      "expectedResult": "1010",
      "tolerance": null
    },
    {
      "name": "Test 0 a binario",
      "className": "Conversor",
      "methodName": "decimalABinario",
      "params": [0],
      "expectedResult": "0",
      "tolerance": null
    }
  ]'::json,
  'Usa divisiones sucesivas por 2',
  true,
  11,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Compuerta XOR',
  E'Implementa la compuerta XOR usando solo AND, OR, NOT.\n\nRequisitos:\n- Método static xor(boolean a, boolean b)\n- Fórmula: (a AND NOT b) OR (NOT a AND b)',
  'digital',
  'easy',
  25,
  25,
  ARRAY['CompuertasLogicas'],
  ARRAY['xor'],
  '[
    {
      "name": "Test false XOR false",
      "className": "CompuertasLogicas",
      "methodName": "xor",
      "params": [false, false],
      "expectedResult": false,
      "tolerance": null
    },
    {
      "name": "Test true XOR false",
      "className": "CompuertasLogicas",
      "methodName": "xor",
      "params": [true, false],
      "expectedResult": true,
      "tolerance": null
    },
    {
      "name": "Test true XOR true",
      "className": "CompuertasLogicas",
      "methodName": "xor",
      "params": [true, true],
      "expectedResult": false,
      "tolerance": null
    }
  ]'::json,
  'XOR retorna true solo si exactamente uno de los inputs es true',
  true,
  12,
  NOW(),
  NOW()
);

-- PROGRAMACIÓN ORIENTADA A OBJETOS

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Clase Rectángulo con Encapsulamiento',
  E'Crea una clase Rectángulo con encapsulamiento.\n\nRequisitos:\n- Atributos privados: ancho, alto\n- Constructor(double ancho, double alto)\n- Getters: getAncho(), getAlto()\n- Métodos: calcularArea(), calcularPerimetro()',
  'oop',
  'easy',
  35,
  20,
  ARRAY['Rectangulo'],
  ARRAY['calcularArea', 'calcularPerimetro'],
  '[
    {
      "name": "Test área 5x10",
      "className": "Rectangulo",
      "methodName": "calcularArea",
      "params": [],
      "expectedResult": 50.0,
      "tolerance": 0.01,
      "setup": "new Rectangulo(5, 10)"
    },
    {
      "name": "Test perímetro 5x10",
      "className": "Rectangulo",
      "methodName": "calcularPerimetro",
      "params": [],
      "expectedResult": 30.0,
      "tolerance": 0.01,
      "setup": "new Rectangulo(5, 10)"
    }
  ]'::json,
  'Área = ancho * alto, Perímetro = 2*(ancho + alto)',
  true,
  13,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Herencia - Figura y Círculo',
  E'Implementa herencia con clases abstractas.\n\nRequisitos:\n- Clase abstracta Figura con métodos abstractos calcularArea() y calcularPerimetro()\n- Clase Circulo que hereda de Figura\n- Constructor Circulo(double radio)\n- Implementa ambos métodos (usa π = 3.14159)',
  'oop',
  'medium',
  45,
  30,
  ARRAY['Figura', 'Circulo'],
  ARRAY['calcularArea', 'calcularPerimetro'],
  '[
    {
      "name": "Test área círculo radio 5",
      "className": "Circulo",
      "methodName": "calcularArea",
      "params": [],
      "expectedResult": 78.54,
      "tolerance": 0.1,
      "setup": "new Circulo(5)"
    },
    {
      "name": "Test perímetro círculo radio 5",
      "className": "Circulo",
      "methodName": "calcularPerimetro",
      "params": [],
      "expectedResult": 31.42,
      "tolerance": 0.1,
      "setup": "new Circulo(5)"
    }
  ]'::json,
  'Área = π*r², Perímetro = 2*π*r',
  true,
  14,
  NOW(),
  NOW()
);

INSERT INTO custom_missions (
  title, description, subject, difficulty, base_points, points_per_test,
  required_classes, required_methods, tests, criteria, is_active, "order", created_at, updated_at
) VALUES (
  'Excepción Personalizada',
  E'Crea y usa excepciones personalizadas.\n\nRequisitos:\n- Clase DivisionPorCeroException que herede de Exception\n- Clase Calculadora con método static dividir(double a, double b) que lance la excepción si b=0',
  'oop',
  'medium',
  40,
  30,
  ARRAY['DivisionPorCeroException', 'Calculadora'],
  ARRAY['dividir'],
  '[
    {
      "name": "Test división normal 10/2",
      "className": "Calculadora",
      "methodName": "dividir",
      "params": [10.0, 2.0],
      "expectedResult": 5.0,
      "tolerance": 0.01
    }
  ]'::json,
  'La excepción debe heredar de Exception y el método debe lanzarla cuando b=0',
  true,
  15,
  NOW(),
  NOW()
);
