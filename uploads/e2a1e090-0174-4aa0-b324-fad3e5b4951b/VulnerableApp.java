import java.io.*;
import java.sql.*;
import java.util.Random;
import java.util.Scanner;

public class VulnerableApp {
    
    // ==================== VULNERABILITY 1: Hardcoded Credentials ====================
    private static final String DB_USER = "admin";
    private static final String DB_PASSWORD = "super_secret_password123";
    private static final String API_KEY = "sk-1234567890abcdef";
    
    // ==================== VULNERABILITY 2: Null Pointer Dereference ====================
    private String userInput = null;
    
    public void processUserInput() {
        userInput = null;
        String result = userInput.toUpperCase(); // NPE - dereferencing null
        System.out.println(result);
    }
    
    // ==================== VULNERABILITY 3: Insecure Random ====================
    public String generateSecurityToken() {
        Random random = new Random();
        long token = random.nextLong();
        return Long.toHexString(token);
    }
    
    // ==================== VULNERABILITY 4: Command Injection ====================
    public void executeSystemCommand(String userCommand) {
        try {
            String cmd = "cmd.exe /c " + userCommand; // Concatenation with user input
            Runtime.getRuntime().exec(cmd); // Command injection vulnerability
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    // ==================== VULNERABILITY 5: SQL Injection ====================
    public void authenticateUser(String username, String password) {
        try {
            String query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
            Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/mydb");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query); // SQL Injection
            
            if (rs.next()) {
                System.out.println("User authenticated");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    // ==================== VULNERABILITY 6: Path Traversal ====================
    public void readFile(String filename) {
        try {
            String filepath = "/safe/directory/" + filename; // User can input "../../../etc/passwd"
            FileInputStream fis = new FileInputStream(filepath);
            Scanner scanner = new Scanner(fis);
            
            while (scanner.hasNextLine()) {
                System.out.println(scanner.nextLine());
            }
            // Resource leak - stream never closed
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }
    }
    
    // ==================== VULNERABILITY 7: Cross-Site Scripting (XSS) ====================
    public void displayUserComment(String userComment) {
        String html = "<html><body>";
        html += "User said: " + userComment; // No escaping - XSS vulnerability
        html += "</body></html>";
        System.out.println(html);
    }
    
    // ==================== VULNERABILITY 8: Resource Leak - Unclosed Stream ====================
    public void downloadFile(String sourceFile) {
        try {
            FileInputStream input = new FileInputStream(sourceFile);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int bytesRead;
            
            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
            // Neither stream is closed - RESOURCE LEAK
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // ==================== VULNERABILITY 9: Insecure String Comparison ====================
    public boolean validateToken(String providedToken) {
        String validToken = "abc123xyz789";
        return providedToken == validToken; // Should use .equals() for security
    }
    
    // ==================== VULNERABILITY 10: SQL Injection via UPDATE ====================
    public void updateUserData(String userId, String fieldName, String fieldValue) {
        try {
            String updateQuery = "UPDATE users SET " + fieldName + " = '" + fieldValue + "' WHERE id = " + userId;
            Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/mydb", DB_USER, DB_PASSWORD);
            Statement stmt = conn.createStatement();
            stmt.executeUpdate(updateQuery); // SQL Injection
            // Connection never closed
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public static void main(String[] args) {
        VulnerableApp app = new VulnerableApp();
        
        // Test methods
        // app.processUserInput();
        // app.executeSystemCommand("dir");
        // app.authenticateUser("admin' --", "whatever");
        // app.readFile("../../etc/passwd");
        // app.displayUserComment("<script>alert('XSS')</script>");
        // app.generateSecurityToken();
    }
}
