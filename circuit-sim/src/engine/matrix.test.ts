import { describe, it, expect } from 'vitest';
import { luFactor, createMatrix } from './matrix';

describe('luFactor', () => {
  it('should return false for a matrix with all zeros', () => {
    const n = 3;
    const a = createMatrix(n);
    const ipvt = new Array(n).fill(0);

    // Matrix `a` is initialized to zeros by createMatrix, but createMatrix uses Float64Array which is typed as number[]
    const result = luFactor(a, n, ipvt);

    expect(result).toBe(false);
  });

  it('should return false for a matrix with a single row of all zeros', () => {
    const n = 3;
    const a = createMatrix(n);

    // Fill with some data
    a[0][0] = 1; a[0][1] = 2; a[0][2] = 3;
    // a[1] remains all zeros
    a[2][0] = 4; a[2][1] = 5; a[2][2] = 6;

    const ipvt = new Array(n).fill(0);

    const result = luFactor(a, n, ipvt);

    expect(result).toBe(false);
  });

  it('should handle linearly dependent rows (near singular) gracefully', () => {
    const n = 2;
    const a = createMatrix(n);

    // Linearly dependent rows
    a[0][0] = 1; a[0][1] = 2;
    a[1][0] = 2; a[1][1] = 4;

    const ipvt = new Array(n).fill(0);

    // It should complete factorization but might modify the 0 pivot to 1e-18
    const result = luFactor(a, n, ipvt);

    // Should still return true as the specific row-all-zeros check doesn't catch linear dependence
    expect(result).toBe(true);
    // Pivot at [1][1] should have been replaced with 1e-18
    expect(a[1][1]).toBeCloseTo(1e-18, 19);
  });

  it('should return true and correctly factor a valid non-singular matrix', () => {
    const n = 2;
    const a = createMatrix(n);

    a[0][0] = 4; a[0][1] = 3;
    a[1][0] = 6; a[1][1] = 3;

    const ipvt = new Array(n).fill(0);

    const result = luFactor(a, n, ipvt);

    expect(result).toBe(true);
    // Verify ipvt for pivoting (row 1 will be swapped to row 0 because 6 > 4)
    expect(ipvt[0]).toBe(1);

    // The matrix should be transformed
    // U should be:
    // [ 6, 3 ]
    // [ 0, 1 ]
    // L should have L[1][0] = 4/6 = 0.666...
    expect(a[0][0]).toBe(6);
    expect(a[0][1]).toBe(3);
    expect(a[1][0]).toBeCloseTo(0.6666666666666666);
    expect(a[1][1]).toBe(1);
  });
});
