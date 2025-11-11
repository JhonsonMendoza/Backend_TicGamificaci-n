public class BuggyCode {
    
    // Bug 1: Método privado nunca llamado
    private void neverCalled() {
        System.out.println("This method is never called");
    }
    
    // Bug 2: Variable de instancia nunca leída
    private int neverRead = 42;
    
    // Bug 3: Comparación incorrecta de String
    public boolean compareStrings(String s1, String s2) {
        return s1 == s2; // Debería usar equals()
    }
    
    // Bug 4: Null dereference obvio
    public void nullPointerBug() {
        String str = null;
        str.toString(); // Null pointer exception garantizada
    }
    
    // Bug 5: Array index out of bounds
    public void arrayBug() {
        int[] arr = new int[5];
        arr[10] = 1; // Index out of bounds
    }
    
    // Bug 6: Dead store
    public void deadStore() {
        int x = 10;
        x = 20; // Valor anterior nunca usado
        System.out.println("Done");
    }
    
    // Bug 7: Comparación de objetos con ==
    public void badComparison() {
        Integer i1 = new Integer(5);
        Integer i2 = new Integer(5);
        if (i1 == i2) { // Debería usar equals()
            System.out.println("Equal");
        }
    }
    
    // Bug 8: Unboxing null
    public void unboxingNull() {
        Integer boxed = null;
        int primitive = boxed; // NullPointerException en unboxing
    }
    
    // Bug 9: Infinite loop
    public void infiniteLoop() {
        for (int i = 0; i >= 0; i++) {
            // Loop infinito
            if (i > 1000) break; // Nunca se alcanza porque i siempre crece
        }
    }
    
    // Bug 10: Resource leak
    public void resourceLeak() {
        try {
            java.io.FileInputStream fis = new java.io.FileInputStream("test.txt");
            // Nunca se cierra el stream
        } catch (Exception e) {
            // Ignore
        }
    }
}