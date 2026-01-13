package com.example;

/**
 * Clase con más vulnerabilidades de seguridad
 */
public class SecurityVulnerabilities {

    // Vulnerabilidad: Campo mutable público
    public String[] sensitiveData = new String[]{"password123", "apikey"};

    // Vulnerabilidad: Método que devuelve un array mutable
    public String[] getSensitiveData() {
        return sensitiveData;  // Puede ser modificado desde fuera
    }

    // Vulnerabilidad: No validar entrada
    public void procesarEntrada(int value) {
        if (value > 0) {
            processData(value);
        }
        // No hay validación real
    }

    private void processData(int value) {
        System.out.println("Procesando: " + value);
    }

    // Vulnerabilidad: Hardcoded password
    private static final String DATABASE_PASSWORD = "admin123";  // Contraseña hardcodeada

    // Vulnerabilidad: Random no seguro
    public String generateToken() {
        java.util.Random random = new java.util.Random();
        return String.valueOf(random.nextInt(10000));  // No es criptográficamente seguro
    }

    // Vulnerabilidad: Exception silenciada
    public void silencedException() {
        try {
            int result = 1 / 0;
        } catch (Exception e) {
            // Ignorando la excepción
        }
    }

    // Vulnerabilidad: Deserialización insegura
    public Object deserialize(byte[] data) throws Exception {
        java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(data);
        java.io.ObjectInputStream ois = new java.io.ObjectInputStream(bais);
        return ois.readObject();  // Vulnerable a serialización insegura
    }

    // Vulnerabilidad: Campo no inicializado
    private SecurityVulnerabilities instance;

    public SecurityVulnerabilities getInstance() {
        return instance;  // Puede retornar null
    }
}
