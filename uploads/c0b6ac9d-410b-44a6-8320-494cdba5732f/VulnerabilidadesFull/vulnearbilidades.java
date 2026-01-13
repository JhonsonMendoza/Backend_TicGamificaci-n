import java.io.*;
import java.sql.*;
import java.util.Random;

public class VulnerableApp {

    // ===== 1. Credenciales hardcodeadas (Semgrep / PMD / SpotBugs) =====
    private static final String DB_USER = "admin";
    private static final String DB_PASSWORD = "admin123";

    public static void main(String[] args) {
        VulnerableApp app = new VulnerableApp();

        // ===== 2. Null Pointer Dereference (SpotBugs / PMD) =====
        String input = null;
        System.out.println(input.length()); // NPE intencional

        // ===== 3. Uso de Random inseguro para algo sensible (SpotBugs) =====
        int token = app.generateToken();
        System.out.println("Token generado: " + token);

        // ===== 4. Command Injection (Semgrep / SpotBugs) =====
        app.runCommand(args.length > 0 ? args[0] : "ls");

        // ===== 5. SQL Injection (Semgrep / PMD / SpotBugs) =====
        app.findUserByName("admin' OR '1'='1");

        // ===== 6. Path Traversal (Semgrep / SpotBugs) =====
        app.readFile("../../etc/passwd");

        // ===== 7. XSS reflejado (Semgrep) =====
        app.printHtml("<script>alert('XSS')</script>");
    }

    // ===== SQL Injection =====
    public void findUserByName(String username) {
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:mysql://localhost/test",
                DB_USER,
                DB_PASSWORD
            );

            // Vulnerable: concatenación directa
            String sql = "SELECT * FROM users WHERE username = '" + username + "'";
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(sql);

            while (rs.next()) {
                System.out.println(rs.getString("username"));
            }

            // ===== 8. Resource Leak (SpotBugs / PMD) =====
            // No se cierran stmt, rs ni conn

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    // ===== Command Injection =====
    public void runCommand(String command) {
        try {
            Runtime.getRuntime().exec(command);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // ===== Insecure Random =====
    public int generateToken() {
        Random random = new Random(); // No criptográficamente seguro
        return random.nextInt(999999);
    }

    // ===== Path Traversal =====
    public void readFile(String filePath) {
        try {
            File file = new File(filePath);
            BufferedReader reader = new BufferedReader(new FileReader(file));

            System.out.println(reader.readLine());

            // Resource leak: reader no cerrado

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // ===== XSS reflejado =====
    public void printHtml(String userInput) {
        // Vulnerable: salida sin sanitizar
        System.out.println("<html><body>" + userInput + "</body></html>");
    }
}
