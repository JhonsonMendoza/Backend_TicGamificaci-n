package com.example;

import java.io.*;
import java.util.*;
import java.util.ArrayList;

public class BuggyProgram {

    private String unusedField = "never used";  // PMD: Unused field
    private int complexityCounter = 0;  // PMD: Unused variable

    public static void main(String[] args) throws IOException {
        BuggyProgram bp = new BuggyProgram();
        
        // Llamar métodos con bugs
        bp.nullPointerBug();
        bp.resourceLeakBug();
        bp.comparisonBug();
        bp.infiniteLoopBug();
        bp.duplicateCodeMethod1();
        bp.duplicateCodeMethod2();
        bp.cyclomaticComplexityBug(5);
        bp.longMethodBug();
    }

    // BUG 1: NullPointerException
    public void nullPointerBug() {
        String str = null;
        System.out.println(str.length());  // NE_ALWAYS_NULL
    }

    // BUG 2: Resource Leak
    public void resourceLeakBug() throws IOException {
        FileInputStream fis = new FileInputStream("test.txt");
        byte[] data = new byte[1024];
        fis.read(data);
        // El archivo nunca se cierra
    }

    // BUG 3: String comparison using ==
    public void comparisonBug() {
        String a = new String("hello");
        String b = new String("hello");
        if (a == b) {  // ES_COMPARING_STRINGS_WITH_EQ
            System.out.println("Strings are equal");
        }
    }

    // BUG 4: Infinite loop
    public void infiniteLoopBug() {
        int i = 0;
        while (i >= 0) {  // IL_INFINITE_LOOP
            i++;
            if (i > 100) break;
        }
    }

    // BUG 5: Dead code
    public void deadCodeBug() {
        int x = 1;
        if (x > 5) {
            System.out.println("X is greater");
        } else {
            return;  // Este código nunca se alcanza después
            System.out.println("This is dead code");  // PMD: Dead code
        }
    }

    // BUG 6: Uninitialized field
    private String uninitialized;

    public String getUninitialized() {
        return uninitialized.toUpperCase();  // NE_ALWAYS_NULL
    }

    // PMD: Duplicate code blocks
    public void duplicateCodeMethod1() {
        int x = 10;
        int y = 20;
        int sum = x + y;
        System.out.println("Sum: " + sum);
        System.out.println("Processing...");
        System.out.println("Done.");
    }

    public void duplicateCodeMethod2() {
        int x = 10;
        int y = 20;
        int sum = x + y;
        System.out.println("Sum: " + sum);
        System.out.println("Processing...");
        System.out.println("Done.");
    }

    // PMD: High cyclomatic complexity
    public void cyclomaticComplexityBug(int value) {
        if (value > 0) {
            if (value > 10) {
                if (value > 20) {
                    if (value > 30) {
                        if (value > 40) {
                            System.out.println("Very high");
                        } else {
                            System.out.println("High");
                        }
                    } else {
                        System.out.println("Medium-high");
                    }
                } else {
                    System.out.println("Medium");
                }
            } else {
                System.out.println("Low");
            }
        } else {
            System.out.println("Zero or negative");
        }
    }

    // PMD: Method is too long
    public void longMethodBug() {
        int var1 = 1;
        int var2 = 2;
        int var3 = 3;
        int var4 = 4;
        int var5 = 5;
        int var6 = 6;
        int var7 = 7;
        int var8 = 8;
        int var9 = 9;
        int var10 = 10;
        System.out.println(var1);
        System.out.println(var2);
        System.out.println(var3);
        System.out.println(var4);
        System.out.println(var5);
        System.out.println(var6);
        System.out.println(var7);
        System.out.println(var8);
        System.out.println(var9);
        System.out.println(var10);
        System.out.println("Another line of code");
        System.out.println("And another");
        System.out.println("And one more");
        System.out.println("Unnecessary code");
        System.out.println("More unnecessary code");
    }
}
