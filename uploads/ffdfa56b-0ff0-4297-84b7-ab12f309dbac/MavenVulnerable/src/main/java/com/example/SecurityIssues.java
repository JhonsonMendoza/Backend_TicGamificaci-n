package com.example;

import java.security.SecureRandom;
import java.util.Random;

public class SecurityIssues {

    // BUG 7: Hardcoded password
    private static final String PASSWORD = "admin123";  // HARD_CODED_PASSWORD
    private static final String SECRET_KEY = "secretkey2024";  // HARD_CODED_SECRET_KEY

    // BUG 8: Weak random number generator
    private static Random weakRandom = new Random();  // WEAK_RANDOM_BYTES

    public int generateWeakToken() {
        return weakRandom.nextInt(10000);  // Débil para seguridad
    }

    // BUG 9: SQL Injection
    public String buildQuery(String username) {
        String query = "SELECT * FROM users WHERE username = '" + username + "'";  // SQL_INJECTION
        return query;
    }

    // BUG 10: Path traversal
    public String getFilePath(String filename) {
        String basePath = "/uploads/";
        return basePath + filename;  // PT_PATH_TRAVERSAL
    }

    // BUG 11: Command injection
    public void executeCommand(String userInput) throws Exception {
        String cmd = "echo " + userInput;  // COMMAND_INJECTION
        Runtime.getRuntime().exec(cmd);
    }

    // BUG 12: Information disclosure
    public void handleException(Exception e) {
        e.printStackTrace();  // Expone información sensible
    }

    // BUG 13: Serialization without version
    public static class MySerializable implements java.io.Serializable {
        public String data;
        // SE_MISSING_SERIALVERSIONUID
    }

    // PMD: Redundant field initializer
    private String redundantInit = null;  // Should just be private String redundantInit;

    // PMD: High cyclomatic complexity in security method
    public void validatePassword(String password) {
        if (password == null) {
            return;
        }
        if (password.length() < 8) {
            return;
        }
        if (!password.matches(".*[A-Z].*")) {
            return;
        }
        if (!password.matches(".*[a-z].*")) {
            return;
        }
        if (!password.matches(".*[0-9].*")) {
            return;
        }
        if (!password.matches(".*[!@#$%^&*].*")) {
            return;
        }
        System.out.println("Valid password");
    }

    // PMD: Long parameter list
    public void processUserData(String name, String email, String phone, 
                                String address, String city, String state, 
                                String zip, String country, String birthDate,
                                String socialSecurity) {
        System.out.println("Processing: " + name);
    }

    // PMD: Clone method without superclone()
    public Object badClone() throws CloneNotSupportedException {
        return new String("cloned");
    }

    // PMD: Unused private method
    private void unusedPrivateMethod() {
        System.out.println("This method is never called");
    }
}
