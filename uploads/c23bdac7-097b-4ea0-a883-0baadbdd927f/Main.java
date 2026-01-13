import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Bug intencional: Null pointer potential
        String str = null;
        System.out.println(str.length()); // SpotBugs detectará esto
        
        // Bug intencional: Unused variable
        int unusedVar = 42; // PMD detectará esto
        
        // Bug intencional: Default encoding
        try {
            FileReader fr = new FileReader("test.txt"); // SpotBugs detectará esto
            BufferedReader br = new BufferedReader(fr);
            String line = br.readLine();
            System.out.println(line.toUpperCase()); // Otro null pointer potential
        } catch (Exception e) {
            System.out.println("Error: " + e);
        }
        
        // Más código problemático
        for(int i = 0; i < 10; i++) {
            System.out.println("Line " + i); // PMD detectará System.out.println
        }
        
        // Hardcoded password (Semgrep detectará esto)
        String password = "admin123";
        String sql = "SELECT * FROM users WHERE password = '" + password + "'"; // SQL injection potential
    }
    
    // Método sin usar
    private void unusedMethod() {
        // PMD detectará método sin usar
    }
}