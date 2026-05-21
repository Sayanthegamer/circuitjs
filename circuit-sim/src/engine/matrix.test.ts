import { describe, it, expect } from 'vitest';
import { luFactor, luSolve, createMatrix, copyMatrix, copyVector } from './matrix';

describe('Matrix operations', () => {
  describe('luFactor and luSolve', () => {
    it('solves a simple 2x2 system', () => {
      // 2x +  y = 5
      // 3x - 2y = 4
      // Expected: x = 2, y = 1
      const a = [
        [2, 1],
        [3, -2]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);
      const b = [5, 4];

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(2);
      expect(b[1]).toBeCloseTo(1);
    });

    it('solves a 3x3 system', () => {
      //  x + 2y + 3z = 9
      // 2x -  y +  z = 8
      // 3x +  y -  z = 2
      // Expected: x = 2, y = -1, z = 3
      // NOTE: luFactor MODIFIES the matrix in place.
      const a = [
        [1, 2, 3],
        [2, -1, 1],
        [3, 1, -1]
      ];
      const n = 3;
      const ipvt = new Array(n).fill(0);
      const b = [9, 8, 2];

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(2);
      expect(b[1]).toBeCloseTo(-1);
      expect(b[2]).toBeCloseTo(3);
    });

    it('handles system requiring pivoting (zero on diagonal)', () => {
      // 0x + 2y = 4
      // 3x + 1y = 5
      // Expected: x = 1, y = 2
      const a = [
        [0, 2],
        [3, 1]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);
      const b = [4, 5];

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(1);
      expect(b[1]).toBeCloseTo(2);
    });

    it('returns false for singular matrices (all zeros in a row)', () => {
      // Singular matrix (row of zeros)
      const a = [
        [1, 2],
        [0, 0]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(false);
    });

    it('solves using multiple right-hand sides with one factorization', () => {
      // 2x + y = b1
      // x  - y = b2
      const a = [
        [2, 1],
        [1, -1]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      // First RHS: b = [5, 1] => x = 2, y = 1
      const b1 = [5, 1];
      luSolve(a, n, ipvt, b1);
      expect(b1[0]).toBeCloseTo(2);
      expect(b1[1]).toBeCloseTo(1);

      // Second RHS: b = [4, -1] => x = 1, y = 2
      const b2 = [4, -1];
      luSolve(a, n, ipvt, b2);
      expect(b2[0]).toBeCloseTo(1);
      expect(b2[1]).toBeCloseTo(2);
    });

    it('supports solving with Float64Array', () => {
      // 4x + 3y = 10
      // 2x - y = 0
      // Expected: x = 1, y = 2
      const a = [
        [4, 3],
        [2, -1]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);
      const b = new Float64Array([10, 0]);

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(1);
      expect(b[1]).toBeCloseTo(2);
    });
  });

  describe('Matrix utilities', () => {
    it('createMatrix initializes an nxn matrix of zeros', () => {
      const n = 3;
      const m = createMatrix(n);

      expect(m.length).toBe(n);
      expect(m[0].length).toBe(n);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          expect(m[i][j]).toBe(0);
        }
      }
    });

    it('copyMatrix creates a deep copy', () => {
      const src = [
        [1, 2],
        [3, 4]
      ];
      const dst = createMatrix(2);

      copyMatrix(src, dst, 2);

      expect(dst[0][0]).toBe(1);
      expect(dst[0][1]).toBe(2);
      expect(dst[1][0]).toBe(3);
      expect(dst[1][1]).toBe(4);

      // Modify src to ensure it's a deep copy (or at least independent)
      src[0][0] = 99;
      expect(dst[0][0]).toBe(1);
    });

    it('copyVector copies between arrays', () => {
      const src = [1, 2, 3];
      const dst = [0, 0, 0];

      copyVector(src, dst, 3);

      expect(dst).toEqual([1, 2, 3]);
    });

    it('copyVector copies between Float64Arrays', () => {
      const src = new Float64Array([1.5, 2.5, 3.5]);
      const dst = new Float64Array([0, 0, 0]);

      copyVector(src, dst, 3);

      expect(dst[0]).toBe(1.5);
      expect(dst[1]).toBe(2.5);
      expect(dst[2]).toBe(3.5);
    });

    it('copyVector copies partial arrays', () => {
      const src = new Float64Array([1, 2, 3, 4, 5]);
      const dst = new Float64Array([0, 0, 0]);

      copyVector(src, dst, 2); // Only copy first 2 elements

      expect(dst[0]).toBe(1);
      expect(dst[1]).toBe(2);
      expect(dst[2]).toBe(0); // Third element untouched
    });
  });
});
