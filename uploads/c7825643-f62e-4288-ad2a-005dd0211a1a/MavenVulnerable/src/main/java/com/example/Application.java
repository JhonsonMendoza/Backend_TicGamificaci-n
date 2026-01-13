package com.example;

/**
 * Clase principal de ejemplo
 */
public class Application {
    public static void main(String[] args) {
        System.out.println("=== Proyecto Maven Vulnerable ===");
        
        VulnerableClass vc = new VulnerableClass();
        
        // Prueba de comparación de strings
        System.out.println("Comparando strings: " + vc.compareStrings("test", "test"));
        
        // Prueba de método con potencial null pointer
        try {
            SecurityVulnerabilities sv = new SecurityVulnerabilities();
            String token = sv.generateToken();
            System.out.println("Token generado: " + token);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
