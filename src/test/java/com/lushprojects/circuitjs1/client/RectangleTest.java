package com.lushprojects.circuitjs1.client;

import org.junit.Test;
import static org.junit.Assert.*;

public class RectangleTest {

    @Test
    public void testDefaultConstructor() {
        Rectangle r = new Rectangle();
        assertEquals(0, r.x);
        assertEquals(0, r.y);
        assertEquals(0, r.width);
        assertEquals(0, r.height);
    }

    @Test
    public void testParameterizedConstructor() {
        Rectangle r = new Rectangle(10, 20, 30, 40);
        assertEquals(10, r.x);
        assertEquals(20, r.y);
        assertEquals(30, r.width);
        assertEquals(40, r.height);
    }

    @Test
    public void testPointConstructor() {
        Point p = new Point(15, 25);
        Rectangle r = new Rectangle(p);
        assertEquals(15, r.x);
        assertEquals(25, r.y);
        assertEquals(0, r.width);
        assertEquals(0, r.height);
    }

    @Test
    public void testCopyConstructor() {
        Rectangle r1 = new Rectangle(5, 10, 15, 20);
        Rectangle r2 = new Rectangle(r1);
        assertEquals(r1.x, r2.x);
        assertEquals(r1.y, r2.y);
        assertEquals(r1.width, r2.width);
        assertEquals(r1.height, r2.height);
        assertNotSame(r1, r2);
    }

    @Test
    public void testSetBounds() {
        Rectangle r = new Rectangle();
        r.setBounds(1, 2, 3, 4);
        assertEquals(1, r.x);
        assertEquals(2, r.y);
        assertEquals(3, r.width);
        assertEquals(4, r.height);
    }

    @Test
    public void testTranslate() {
        Rectangle r = new Rectangle(10, 10, 10, 10);
        r.translate(5, -2);
        assertEquals(15, r.x);
        assertEquals(8, r.y);
        assertEquals(10, r.width);
        assertEquals(10, r.height);
    }

    @Test
    public void testContains() {
        Rectangle r = new Rectangle(10, 10, 20, 20);
        assertTrue("Should contain point (15, 15)", r.contains(15, 15));
        assertTrue("Should contain top-left corner (10, 10)", r.contains(10, 10));
        assertFalse("Should not contain point (30, 30) - boundaries are exclusive", r.contains(30, 30));
        assertFalse("Should not contain point (5, 5)", r.contains(5, 5));

        Rectangle rEmpty = new Rectangle(10, 10, 0, 0);
        assertFalse("Empty rectangle should not contain its origin", rEmpty.contains(10, 10));

        Rectangle rNegative = new Rectangle(10, 10, -1, -1);
        assertFalse("Negative dimension rectangle should not contain points", rNegative.contains(10, 10));
    }

    @Test
    public void testIntersects() {
        Rectangle r1 = new Rectangle(0, 0, 10, 10);
        Rectangle r2 = new Rectangle(5, 5, 10, 10);
        Rectangle r3 = new Rectangle(15, 15, 5, 5);
        Rectangle r4 = new Rectangle(-5, -5, 6, 6);

        assertTrue("r1 should intersect r2", r1.intersects(r2));
        assertTrue("r2 should intersect r1", r2.intersects(r1));
        assertFalse("r1 should not intersect r3", r1.intersects(r3));
        assertTrue("r1 should intersect r4", r1.intersects(r4));

        Rectangle rEmpty = new Rectangle(5, 5, 0, 0);
        assertFalse("r1 should not intersect empty rEmpty", r1.intersects(rEmpty));
    }

    @Test
    public void testUnion() {
        Rectangle r1 = new Rectangle(0, 0, 10, 10);
        Rectangle r2 = new Rectangle(5, 5, 10, 10);
        Rectangle u = r1.union(r2);

        assertEquals(0, u.x);
        assertEquals(0, u.y);
        assertEquals(15, u.width);
        assertEquals(15, u.height);

        Rectangle r3 = new Rectangle(20, 20, 5, 5);
        u = r1.union(r3);
        assertEquals(0, u.x);
        assertEquals(0, u.y);
        assertEquals(25, u.width);
        assertEquals(25, u.height);

        Rectangle rNegative = new Rectangle(0, 0, -1, -1);
        assertEquals("Union with negative should return other", r2, rNegative.union(r2));
        assertEquals("Union with negative should return other", r2, r2.union(rNegative));
    }

    @Test
    public void testEquals() {
        Rectangle r1 = new Rectangle(1, 2, 3, 4);
        Rectangle r2 = new Rectangle(1, 2, 3, 4);
        Rectangle r3 = new Rectangle(0, 2, 3, 4);

        assertEquals(r1, r2);
        assertNotEquals(r1, r3);
        assertNotEquals(r1, "not a rectangle");
        assertNotEquals(r1, null);
    }

    @Test
    public void testToString() {
        Rectangle r = new Rectangle(1, 2, 3, 4);
        assertEquals("Rect(1,2,3,4)", r.toString());
    }

    @Test
    public void testHashCode() {
        Rectangle r1 = new Rectangle(1, 2, 3, 4);
        Rectangle r2 = new Rectangle(1, 2, 3, 4);
        Rectangle r3 = new Rectangle(0, 2, 3, 4);

        assertEquals(r1.hashCode(), r2.hashCode());
        // Hash codes don't HAVE to be different for different objects, but they usually are.
        assertNotEquals(r1.hashCode(), r3.hashCode());
    }
}
