import java.io.*;
import java.util.*;
import java.sql.*;

public class Main {
    private static String password = "admin123"; // Hardcoded password
    
    public static void main(String[] args) {
        // Null pointer dereference - SpotBugs debería detectar esto
        String str = null;
        int length = str.length();
        
        // Unused variable - PMD debería detectar esto
        int unused = 42;
        
        // Resource leak - SpotBugs debería detectar esto
        try {
            FileInputStream fis = new FileInputStream("test.txt");
            // No cerrar el stream intencionalmente
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        // SQL Injection - Semgrep debería detectar esto
        String userInput = args.length > 0 ? args[0] : "1";
        String query = "SELECT * FROM users WHERE id = " + userInput;
        
        // Division by zero potential
        int x = 0;
        int result = 10 / x;
        
        // Empty catch block - PMD debería detectar esto
        try {
            riskyOperation();
        } catch (Exception e) {
            // Catch vacío
        }
        
        // Hardcoded secret - Semgrep debería detectar esto
        String apiKey = "sk-1234567890abcdef";
        connectToAPI(apiKey);
    }
    
    private static void riskyOperation() throws Exception {
        throw new Exception("Test");
    }
    
    private static void connectToAPI(String key) {
        // Simulación
    }
    
    // Método sin usar - PMD debería detectar esto
    private void unusedMethod() {
        String deadCode = "never used";
    }
}