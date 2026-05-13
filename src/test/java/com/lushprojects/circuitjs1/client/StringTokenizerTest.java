package com.lushprojects.circuitjs1.client;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.NoSuchElementException;

public class StringTokenizerTest {

    @Test
    public void testDefaultDelimiters() {
        StringTokenizer st = new StringTokenizer("Hello World\tTest\nLine");
        assertEquals("Hello", st.nextToken());
        assertEquals("World", st.nextToken());
        assertEquals("Test", st.nextToken());
        assertEquals("Line", st.nextToken());
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testCustomDelimiters() {
        StringTokenizer st = new StringTokenizer("apple,orange;banana", ",;");
        assertEquals("apple", st.nextToken());
        assertEquals("orange", st.nextToken());
        assertEquals("banana", st.nextToken());
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testNextTokenWithDelim() {
        StringTokenizer st = new StringTokenizer("apple,orange;banana", ",");
        assertEquals("apple", st.nextToken());
        // Change delimiter to ;
        // Note: the previous delimiter ',' is not skipped because it's not in the new delimiter set.
        assertEquals(",orange", st.nextToken(";"));
        assertEquals("banana", st.nextToken());
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testReturnDelims() {
        StringTokenizer st = new StringTokenizer("a,b", ",", true);
        assertEquals("a", st.nextToken());
        assertEquals(",", st.nextToken());
        assertEquals("b", st.nextToken());
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testHasMoreTokens() {
        StringTokenizer st = new StringTokenizer("one two");
        assertTrue(st.hasMoreTokens());
        st.nextToken();
        assertTrue(st.hasMoreTokens());
        st.nextToken();
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testCountTokens() {
        StringTokenizer st = new StringTokenizer("one two three");
        assertEquals(3, st.countTokens());
        st.nextToken();
        assertEquals(2, st.countTokens());
    }

    @Test
    public void testCountTokensWithRetDelims() {
        StringTokenizer st = new StringTokenizer("a b", " ", true);
        assertEquals(3, st.countTokens()); // "a", " ", "b"
    }

    @Test
    public void testEnumeration() {
        StringTokenizer st = new StringTokenizer("one two");
        assertTrue(st.hasMoreElements());
        assertEquals("one", st.nextElement());
        assertTrue(st.hasMoreElements());
        assertEquals("two", st.nextElement());
        assertFalse(st.hasMoreElements());
    }

    @Test(expected = NoSuchElementException.class)
    public void testNoSuchElementException() {
        StringTokenizer st = new StringTokenizer("");
        st.nextToken();
    }

    @Test
    public void testEmptyString() {
        StringTokenizer st = new StringTokenizer("");
        assertFalse(st.hasMoreTokens());
        assertEquals(0, st.countTokens());
    }

    @Test
    public void testOnlyDelimiters() {
        StringTokenizer st = new StringTokenizer("   \t\n");
        assertFalse(st.hasMoreTokens());
        assertEquals(0, st.countTokens());
    }

    @Test
    public void testConsecutiveDelimiters() {
        StringTokenizer st = new StringTokenizer("one   two");
        assertEquals("one", st.nextToken());
        assertEquals("two", st.nextToken());
        assertFalse(st.hasMoreTokens());
    }

    @Test
    public void testConsecutiveDelimitersWithRetDelims() {
        StringTokenizer st = new StringTokenizer("a  b", " ", true);
        assertEquals("a", st.nextToken());
        assertEquals(" ", st.nextToken());
        assertEquals(" ", st.nextToken());
        assertEquals("b", st.nextToken());
    }
}
