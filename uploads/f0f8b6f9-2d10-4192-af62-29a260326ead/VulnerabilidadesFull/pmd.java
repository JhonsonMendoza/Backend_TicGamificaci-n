import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class PMDVulnerableExample {

    // ===== 1. Credenciales hardcodeadas (PMD Security) =====
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "password123";

    // ===== 2. Campo público innecesario (PMD Design) =====
    public String status;

    public static void main(String[] args) {

        PMDVulnerableExample example = new PMDVulnerableExample();

        // ===== 3. Null Pointer Dereference (PMD Error Prone) =====
        String text = null;
        System.out.println(text.length());

        // ===== 4. Empty Catch Block (PMD Error Prone) =====
        try {
            int x = 10 / 0;
        } catch (Exception e) {
            // vacío a propósito
        }

        // ===== 5. Unused Local Variable (PMD Best Practices) =====
        int unused = 42;

        // ===== 6. Avoid Instantiating Objects in Loops (PMD Performance) =====
        for (int i = 0; i < 5; i++) {
            String temp = new String("PMD");
            System.out.println(temp);
        }

        // ===== 7. Avoid Using if..else Chains (PMD Design) =====
        int value = 5;
        if (value == 1) {
            System.out.println("Uno");
        } else if (value == 2) {
            System.out.println("Dos");
        } else if (value == 3) {
            System.out.println("Tres");
        } else {
            System.out.println("Otro");
        }

        // ===== 8. Inefficient Empty List Check (PMD Performance) =====
        List<String> list = new ArrayList<>();
        if (list.size() == 0) {
            System.out.println("Lista vacía");
        }

        // ===== 9. SQL Injection (PMD Security) =====
        example.findUser("admin' OR '1'='1");
    }

    // ===== 10. Método demasiado largo (PMD Design) =====
    public void findUser(String username) {
        try {
            Connection conn = DriverManager.getConnection(
                    "jdbc:mysql://localhost/test",
                    DB_USER,
                    DB_PASSWORD
            );

            Statement stmt = conn.createStatement();

            // Vulnerable a SQL Injection
            String sql = "SELECT * FROM users WHERE username = '" + username + "'";
            ResultSet rs = stmt.executeQuery(sql);

            while (rs.next()) {
                System.out.println(rs.getString("username"));
            }

            // ===== 11. Recursos no cerrados (PMD Best Practices) =====
            // stmt.close();
            // conn.close();

        } catch (Exception e) {
            // ===== 12. Catch genérico (PMD Error Prone) =====
            e.printStackTrace();
        }
    }
}
