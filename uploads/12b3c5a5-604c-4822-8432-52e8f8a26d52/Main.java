import java.util.*;

public class Main {
    
    public static void main(String[] args) {
        // Bug 1: Comparación incorrecta de String con ==
        String str1 = new String("test");
        String str2 = new String("test"); 
        if (str1 == str2) { // SpotBugs: ES_COMPARING_STRINGS_WITH_EQ
            System.out.println("Equal");
        }
        
        // Bug 2: Null pointer dereference obvio
        String nullStr = null;
        System.out.println(nullStr.length()); // SpotBugs: NP_ALWAYS_NULL
        
        // Bug 3: Array index out of bounds
        int[] arr = new int[5];
        arr[10] = 1; // Índice fuera de límites
        
        // Bug 4: Infinite loop
        for (int i = 0; i >= 0; i++) {
            if (i > 1000000) break; // SpotBugs debería detectar esto
        }
        
        // Bug 5: Boxing/Unboxing con null
        Integer boxedInt = null;
        int primitive = boxedInt; // SpotBugs: NP_UNBOXING_IMMEDIATELY_AFTER_NULL_CHECK
        
        // Bug 6: Dead store
        int x = 10;
        x = 20; // SpotBugs: DLS_DEAD_LOCAL_STORE
        
        // Bug 7: Bad use of equals
        String s = "test";
        if ("test".equals(s)) { // Esto está bien
            System.out.println("OK");
        }
        if (s.equals("test")) { // Esto puede causar NPE si s es null
            System.out.println("Risky");
        }
        
        // Bug 8: Unused variable
        int unused = 42; // PMD debería detectar esto
        
        // Bug 9: Empty catch block  
        try {
            Integer.parseInt("not-a-number");
        } catch (NumberFormatException e) {
            // Catch vacío - PMD debería detectar esto
        }
        
        // Bug 10: Bad comparison
        Double d1 = 1.0;
        Double d2 = 1.0;
        if (d1 == d2) { // SpotBugs: RC_REF_COMPARISON_BAD_PRACTICE
            System.out.println("Bad comparison");
        }
    }
    
    // Método nunca usado
    private static void unusedMethod() {
        // PMD debería detectar método sin usar
        System.out.println("Never called");
    }
}