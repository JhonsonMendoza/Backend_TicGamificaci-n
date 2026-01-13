package com.example;

import java.util.*;

public class PerformanceIssues {

    // BUG 14: Unused variable
    public void unusedVariable() {
        int unused = 42;  // UC_UNUSED_PUBLIC_OR_PROTECTED_MEMBER
    }

    // BUG 15: Inefficient use of keySet
    public void inefficientLoop(Map<String, String> map) {
        for (String key : map.keySet()) {  // IME_INEFFICIENT_COLLECTION
            String value = map.get(key);
        }
    }

    // BUG 16: Array cast
    public void arrayCast() {
        Object[] objects = new Object[10];
        String[] strings = (String[]) objects;  // BC_IMPOSSIBLE_CAST
    }

    // BUG 17: Boxed primitive equality
    public void boxedEquality() {
        Integer i1 = new Integer(100);
        Integer i2 = new Integer(100);
        if (i1 == i2) {  // BX_BOXING_IMMEDIATELY_UNBOXED
            System.out.println("Equal");
        }
    }

    // BUG 18: Mutable static field
    public static List<String> publicMutableList = new ArrayList<>();  // MS_MUTABLE_COLLECTION

    // BUG 19: Field shadows parent
    private int field;

    // BUG 20: Return value ignored
    public void ignoreReturnValue() {
        String s = "test";
        s.toUpperCase();  // RV_RETURN_VALUE_IGNORED
    }
}
