package com.example;

import org.junit.Test;
import static org.junit.Assert.*;

public class VulnerableClassTest {

    @Test
    public void testCompareStrings() {
        VulnerableClass vc = new VulnerableClass();
        assertTrue(vc.compareStrings("test", "test"));
    }

    @Test
    public void testAccessArrayUnsafely() {
        VulnerableClass vc = new VulnerableClass();
        int[] array = {1, 2, 3};
        int result = vc.accessArrayUnsafely(array, 0);
        assertEquals(1, result);
    }
}
