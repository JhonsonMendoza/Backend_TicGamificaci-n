package com.example;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Clase con múltiples vulnerabilidades para probar SpotBugs
 */
public class VulnerableClass {

    // Vulnerabilidad 1: Campo sin inicializar
    private String uninitialized;

    // Vulnerabilidad 2: Comparación de objetos con ==
    public boolean compareStrings(String a, String b) {
        return a == b;  // Debería usar .equals()
    }

    // Vulnerabilidad 3: Null Pointer
    public int getLength(String str) {
        return str.length();  // Sin validar si str es null
    }

    // Vulnerabilidad 4: Resource leak (FileReader no cerrado)
    public String readFile(String filename) throws IOException {
        FileReader reader = new FileReader(filename);  // No se cierra
        char[] chars = new char[1024];
        reader.read(chars);
        return new String(chars);
    }

    // Vulnerabilidad 5: SQL Injection
    public void vulnerableSqlQuery(String userId) throws SQLException {
        String query = "SELECT * FROM users WHERE id = " + userId;  // SQL Injection
        Connection conn = null;
        try {
            conn = DriverManager.getConnection("jdbc:h2:mem:test");
            Statement stmt = conn.createStatement();
            stmt.execute(query);
        } finally {
            if (conn != null) {
                conn.close();
            }
        }
    }

    // Vulnerabilidad 6: Campo sin inicializar accedido
    public void useUninitialized() {
        System.out.println(uninitialized.length());  // NullPointer
    }

    // Vulnerabilidad 7: Conversión insegura
    public void unsafeCast(Object obj) {
        String str = (String) obj;  // Sin verificar tipo
        System.out.println(str);
    }

    // Vulnerabilidad 8: Variable nunca usada
    public void methodWithUnusedVariable() {
        int unusedVar = 42;
        System.out.println("Hola");  // unusedVar no se usa
    }

    // Vulnerabilidad 9: Comparación con null usando ==
    public boolean checkNull(String value) {
        return value == null;  // Debería ser funcionalmente similar pero SpotBugs puede detectar patrones
    }

    // Vulnerabilidad 10: Array index out of bounds potencial
    public int accessArrayUnsafely(int[] array, int index) {
        return array[index];  // Sin validar bounds
    }
}
