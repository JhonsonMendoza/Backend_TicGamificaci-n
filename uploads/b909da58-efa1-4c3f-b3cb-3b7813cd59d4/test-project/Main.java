import java.util.*;
import java.security.SecureRandom;
import java.sql.*;

public class Main {
    
    public static void main(String[] args) {
        // Bug 1: Comparación incorrecta de String con ==
        String str1 = new String("test");
        String str2 = new String("test"); 
        if (str1 == str2) { // ES_COMPARING_STRINGS_WITH_EQ
            System.out.println("Equal");
        }
        
        // Bug 2: Null pointer dereference obvio - Runtime Exception
        String nullStr = null;
        try {
            System.out.println(nullStr.length()); // NP_ALWAYS_NULL
        } catch (Exception e) {
            // Ignore
        }
        
        // Bug 3: Array index out of bounds - Runtime Exception
        int[] arr = new int[5];
        try {
            arr[10] = 1; // ArrayIndexOutOfBoundsException
        } catch (Exception e) {
            // Ignore
        }
        
        // Bug 4: Infinite loop potential
        int counter = 0;
        while (counter >= 0) {
            counter++;
            if (counter > 100) break; // Evitar loop infinito real
        }
        
        // Bug 5: Boxing/Unboxing con null - Runtime Exception  
        Integer boxedInt = null;
        try {
            int primitive = boxedInt; // NullPointerException en unboxing
        } catch (Exception e) {
            // Ignore
        }
        
        // Bug 6: Dead store - variable asignada pero nunca leída
        int x = 10;
        x = 20; // DLS_DEAD_LOCAL_STORE - x nunca se lee después
        
        // Bug 7: Bad use of equals - potencial NPE
        String s = null;
        try {
            if (s.equals("test")) { // Potencial NPE
                System.out.println("Risky");
            }
        } catch (Exception e) {
            // Ignore NPE
        }
        
        // Bug 8: Unused variables - múltiples variables sin usar
        int unused1 = 42;
        String unused2 = "never used";
        Double unused3 = 3.14;
        
        // Bug 9: Empty catch block - mala práctica
        try {
            Integer.parseInt("not-a-number");
        } catch (NumberFormatException e) {
            // Empty catch block - bad practice
        }
        
        // Bug 10: Bad reference comparison
        Double d1 = new Double(1.0);
        Double d2 = new Double(1.0);
        if (d1 == d2) { // RC_REF_COMPARISON_BAD_PRACTICE
            System.out.println("Bad comparison");
        }
        
        // Bug 11: Hardcoded password/secret
        String password = "admin123"; // Security issue
        String apiKey = "sk-1234567890abcdef"; // Hardcoded secret
        
        // Bug 12: SQL Injection potential
        String userId = "1 OR 1=1";
        String query = "SELECT * FROM users WHERE id = " + userId; // SQL Injection
    }
    
    // Método nunca usado
    private static void unusedMethod() {
        // PMD debería detectar método sin usar
        System.out.println("Never called");
    }
}