package com.test;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class BuggyCode {
    
    // BUG 1: Null Pointer Dereference
    public static void nullPointerBug() {
        String str = null;
        System.out.println(str.toString()); // NullPointerException garantizada
    }

    // BUG 2: Resource Leak
    public static String readFileWithLeak(String filename) throws IOException {
        // FALLA: No se cierra el BufferedReader
        BufferedReader reader = new BufferedReader(new FileReader(filename));
        String line = reader.readLine();
        return line; // Reader nunca se cierra - MEMORY LEAK
    }

    // BUG 3: Resource Leak - Mejor versión pero aún incompleta
    public static String readFileWithPartialLeak(String filename) throws IOException {
        BufferedReader reader = new BufferedReader(new FileReader(filename));
        try {
            return reader.readLine();
        } catch (IOException e) {
            throw e;
        }
        // FALLA: No hay finally o try-with-resources
    }

    // BUG 4: Comparison with ==
    public static void stringComparisonBug() {
        String a = new String("hello");
        String b = new String("hello");
        
        if (a == b) { // INCORRECTO: Compara referencias, no contenido
            System.out.println("Strings son iguales");
        }
    }

    // BUG 5: Boxing/Unboxing
    public static void boxingBug() {
        Integer boxed = null;
        int primitive = boxed; // NullPointerException en unboxing
        System.out.println(primitive);
    }

    // BUG 6: Unused Variable
    public static void unusedVariableBug() {
        int unused = 42;
        String neverUsed = "This is never read";
        System.out.println("Hello"); // Las variables no se usan
    }

    // BUG 7: Empty Catch Block
    public static void emptyCatchBug() {
        try {
            int x = 1 / 0;
        } catch (Exception e) {
            // FALTA: Manejo de la excepción - silenciosamente ignora errores
        }
    }

    // BUG 8: Field Leak
    private FileReader leakedReader; // Nunca se cierra
    
    public void setupReaderWithLeak(String filename) throws IOException {
        leakedReader = new FileReader(filename);
    }

    // BUG 9: Infinite Loop
    public static void infiniteLoopBug() {
        int i = 0;
        while (true) { // Nunca termina
            i++;
            if (i > 1000) {
                break; // Pero podría haber estado perdido sin este break
            }
        }
    }

    // BUG 10: Dead Code
    public static void deadCodeBug(int x) {
        if (x > 0) {
            return; // Esta rama siempre retorna
        }
        // Código inalcanzable abajo (si x siempre es > 0)
        System.out.println("This might never execute");
    }

    public static void main(String[] args) throws IOException {
        System.out.println("Proyecto con código vulnerable para análisis con SpotBugs");
    }
}
