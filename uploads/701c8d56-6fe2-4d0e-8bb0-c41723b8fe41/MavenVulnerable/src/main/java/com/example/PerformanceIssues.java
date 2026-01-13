package com.example;

import java.util.*;
import java.io.IOException;

public class PerformanceIssues {

    // BUG 14: Unused variable (PMD: UnusedLocalVariable)
    public void unusedVariable() {
        int unused = 42;
        String unusedStr = "never used";
        int anotherUnused;
    }

    // BUG 15: Inefficient use of keySet (PMD: CollapsedForStatementToForeach)
    public void inefficientLoop(Map<String, String> map) {
        for (String key : map.keySet()) {  // Should use entrySet()
            String value = map.get(key);
            System.out.println(key + " -> " + value);
        }
    }

    // PMD: Unused import
    public void arrayCast() {
        Object[] objects = new Object[10];
        String[] strings = (String[]) objects;
    }

    // PMD: Boxed primitive equality
    public void boxedEquality() {
        Integer i1 = new Integer(100);
        Integer i2 = new Integer(100);
        if (i1 == i2) {  // Should use .equals()
            System.out.println("Equal");
        }
    }

    // BUG 18: Mutable static field (PMD: Static field)
    public static List<String> publicMutableList = new ArrayList<>();

    // BUG 19: Field shadows parent
    private int field;

    // BUG 20: Return value ignored (PMD: UnusedReturnValue)
    public void ignoreReturnValue() {
        String s = "test";
        s.toUpperCase();  // Return value not used
    }

    // PMD: Empty catch block
    public void emptycatchBug() {
        try {
            int x = 1 / 0;
        } catch (ArithmeticException e) {
            // PMD: Empty catch block
        }
    }

    // PMD: Missing braces in if statement
    public void missingBraces(boolean condition) {
        if (condition)
            System.out.println("True");
            System.out.println("Always prints");
    }

    // PMD: Variables not in order
    public void variableDeclarationOrder() {
        int x = 1;
        String name = "test";
        int y = 2;  // Should be declared with x
    }

    // PMD: Similar method name
    public void procesData() {
        System.out.println("Processing data");
    }

    public void processData() {
        System.out.println("Processing data");
    }
}
