package com.example;

import java.io.*;

public class BuggyProgram {

    public static void main(String[] args) throws IOException {
        BuggyProgram bp = new BuggyProgram();
        
        // Llamar métodos con bugs
        bp.nullPointerBug();
        bp.resourceLeakBug();
        bp.comparisonBug();
        bp.infiniteLoopBug();
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
            // System.out.println("This is dead code");
        }
    }

    // BUG 6: Uninitialized field
    private String uninitialized;

    public String getUninitialized() {
        return uninitialized.toUpperCase();  // NE_ALWAYS_NULL
    }
}
