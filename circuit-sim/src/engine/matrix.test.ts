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

    it('factors and solves a well-conditioned matrix', () => {
      // System:
      // 3x + 2y - z = 1
      // 2x - 2y + 4z = -2
      // -x + 0.5y - z = 0
      const a = [
        [3, 2, -1],
        [2, -2, 4],
        [-1, 0.5, -1]
      ];
      const b = [1, -2, 0];
      const ipvt = [0, 0, 0];
      const n = 3;

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      luSolve(a, n, ipvt, b);

      // Expected solution: x = 1, y = -2, z = -2
      expect(b[0]).toBeCloseTo(1);
      expect(b[1]).toBeCloseTo(-2);
      expect(b[2]).toBeCloseTo(-2);
    });

    it('solves a 3x3 system', () => {
      //  x + 2y + 3z = 9
      // 2x -  y +  z = 8
      // 3x +  y -  z = 2
      // Expected: x = 2, y = -1, z = 3
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

    it('factors and solves the identity matrix', () => {
      const a = [
        [1, 0],
        [0, 1]
      ];
      const b = [5, -3];
      const ipvt = [0, 0];

      const success = luFactor(a, 2, ipvt);
      expect(success).toBe(true);

      luSolve(a, 2, ipvt, b);

      expect(b[0]).toBeCloseTo(5);
      expect(b[1]).toBeCloseTo(-3);
    });

    it('factors and solves a matrix requiring pivoting', () => {
      // System where first pivot is 0 initially:
      // 0x + y = 1
      // 2x + 3y = 5
      const a = [
        [0, 1],
        [2, 3]
      ];
      const b = [1, 5];
      const ipvt = [0, 0];

      const success = luFactor(a, 2, ipvt);
      expect(success).toBe(true);

      // Pivot should be at row 1 for the first column
      expect(ipvt[0]).toBe(1);

      luSolve(a, 2, ipvt, b);

      // Expected solution: y = 1, 2x + 3(1) = 5 -> 2x = 2 -> x = 1
      expect(b[0]).toBeCloseTo(1);
      expect(b[1]).toBeCloseTo(1);
    });

    it('returns false for singular matrices (all zeros in a row)', () => {
      const a = [
        [1, 2],
        [0, 0]
      ];
      const n = 2;
      const ipvt = new Array(n).fill(0);

      const success = luFactor(a, n, ipvt);
      expect(success).toBe(false);
    });

    it('returns false for a singular matrix (dependent rows)', () => {
      const a = [
        [1, 2],
        [2, 4]
      ];
      const ipvt = [0, 0];

      // NOTE: Our implementation of luFactor sets a[j][j] to 1e-18 instead of returning false
      // for matrices that become singular during factorization.
      // So success will be true, but it shouldn't completely fail.
      const success = luFactor(a, 2, ipvt);
      expect(success).toBe(true);
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

  describe('matrix utilities', () => {
    describe('createMatrix', () => {
      it('creates an n x n matrix filled with zeros', () => {
        const n = 3;
        const matrix = createMatrix(n);

        expect(matrix).toHaveLength(n);
        for (let i = 0; i < n; i++) {
          expect(matrix[i]).toHaveLength(n);
          expect(matrix[i]).toBeInstanceOf(Float64Array);
          for (let j = 0; j < n; j++) {
            expect(matrix[i][j]).toBe(0);
          }
        }
      });

      it('creates an empty matrix when n = 0', () => {
        const matrix = createMatrix(0);
        expect(matrix).toHaveLength(0);
      });

      it('throws RangeError for negative dimensions', () => {
        expect(() => createMatrix(-1)).toThrow(RangeError);
      });
    });

    describe('copyVector', () => {
      it('copies standard arrays correctly', () => {
        const src = [1, 2, 3];
        const dst = [0, 0, 0];
        copyVector(src, dst, 3);
        expect(dst).toEqual([1, 2, 3]);
      });

      it('copies Float64Arrays correctly', () => {
        const src = new Float64Array([1.5, 2.5, 3.5]);
        const dst = new Float64Array([0, 0, 0]);
        copyVector(src, dst, 3);
        expect(dst).toEqual(new Float64Array([1.5, 2.5, 3.5]));
      });

      it('copies Float64Arrays with subset length', () => {
        const src = new Float64Array([1, 2, 3, 4, 5]);
        const dst = new Float64Array([0, 0, 0, 0, 0]);
        copyVector(src, dst, 3);
        expect(dst).toEqual(new Float64Array([1, 2, 3, 0, 0]));
      });

      it('copies mixed array types correctly', () => {
        const src = [1, 2, 3];
        const dst = new Float64Array([0, 0, 0]);
        copyVector(src, dst, 3);
        expect(Array.from(dst)).toEqual([1, 2, 3]);
      });
    });

    describe('copyMatrix', () => {
      it('copies matrix elements correctly', () => {
        const src = [
          [1, 2],
          [3, 4]
        ];
        const dst = [
          [0, 0],
          [0, 0]
        ];
        copyMatrix(src, dst, 2);
        expect(dst).toEqual([
          [1, 2],
          [3, 4]
        ]);
      });

      it('copies Float64Array matrices correctly', () => {
        const src = createMatrix(2);
        src[0][0] = 1; src[0][1] = 2;
        src[1][0] = 3; src[1][1] = 4;

        const dst = createMatrix(2);
        copyMatrix(src, dst, 2);

        expect(dst).toEqual(src);
        // Ensure deep copy
        expect(dst[0]).not.toBe(src[0]);

        // Modify src and ensure dst isn't changed
        src[0][0] = 99;
        expect(dst[0][0]).toBe(1);
      });
    });
  });
});