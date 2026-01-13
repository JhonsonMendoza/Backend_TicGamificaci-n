package com.test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class SecurityBugs {
    
    // BUG 1: Hardcoded Credentials
    private static final String DB_PASSWORD = "admin123"; // Contraseña hardcodeada
    private static final String API_KEY = "sk-1234567890abcdef"; // API Key expuesta
    
    // BUG 2: SQL Injection
    public static String getUserQuery(String userId) {
        // VULNERABLE: Concatenación directa sin prepared statement
        String query = "SELECT * FROM users WHERE id = " + userId;
        return query;
    }
    
    // BUG 3: SQL Injection con password
    public static String loginQuery(String username, String password) {
        // CRÍTICO: SQL Injection vulnerability
        String query = "SELECT * FROM users WHERE username = '" + username + 
                      "' AND password = '" + password + "'";
        return query;
    }
    
    // BUG 4: Command Injection potential
    public static void executeCommand(String userInput) throws Exception {
        // DANGEROUS: No se valida entrada del usuario
        String command = "ping " + userInput;
        Runtime.getRuntime().exec(command);
    }
    
    // BUG 5: Path Traversal
    public static String readUserFile(String filename) throws Exception {
        // VULNERABLE: Sin validación de path
        String filepath = "/user/files/" + filename;
        return filepath;
    }
    
    // BUG 6: Weak Cryptography
    public static void weakCrypto() throws Exception {
        // Usando algoritmo débil (MD5)
        String password = "myPassword";
        // java.security.MessageDigest.getInstance("MD5"); // WEAK
    }
    
    // BUG 7: Insecure Random
    public static int insecureRandom() {
        return (int) System.currentTimeMillis() % 100; // No criptográficamente seguro
    }
    
    // BUG 8: XXE Vulnerability potential
    public static void parseXML(String xmlInput) throws Exception {
        // Sin deshabilitación de XXE
        org.xml.sax.XMLReader reader = org.xml.sax.XMLReaderFactory.createXMLReader();
        // reader.parse(xmlInput); // XXE vulnerable
    }
    
    // BUG 9: Deserialization Risk
    public static void unsafeDeserialization(byte[] data) throws Exception {
        // DANGEROUS: Deserializar datos untrusted
        java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(data);
        java.io.ObjectInputStream ois = new java.io.ObjectInputStream(bais);
        Object obj = ois.readObject(); // Deserialization attack
    }
    
    // BUG 10: Information Disclosure
    public static void logSensitiveData() {
        String apiKey = "sk-1234567890abcdef";
        String dbPassword = "admin123";
        
        System.out.println("API Key: " + apiKey); // Expone información sensible
        System.out.println("DB Password: " + dbPassword);
    }
    
    public static void main(String[] args) {
        System.out.println("Código con vulnerabilidades de seguridad");
    }
}
