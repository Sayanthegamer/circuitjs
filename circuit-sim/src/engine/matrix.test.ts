import { describe, it, expect } from 'vitest';
import {
  luFactor,
  luSolve,
  createMatrix,
  copyMatrix,
  copyVector
} from './matrix';

describe('Matrix Engine Utilities', () => {
  describe('createMatrix', () => {
    it('creates an n x n matrix representation', () => {
      const n = 3;
      const matrix = createMatrix(n);
      expect(matrix).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        expect(matrix[i]).toBeInstanceOf(Float64Array);
        expect(matrix[i]).toHaveLength(n);
      }
    });
  });

  describe('copyVector', () => {
    it('copies standard arrays', () => {
      const src = [1, 2, 3];
      const dst = [0, 0, 0];
      copyVector(src, dst, 3);
      expect(dst).toEqual([1, 2, 3]);
    });

    it('copies Float64Arrays efficiently', () => {
      const src = new Float64Array([1.5, 2.5, 3.5]);
      const dst = new Float64Array(3);
      copyVector(src, dst, 3);
      expect(dst).toEqual(new Float64Array([1.5, 2.5, 3.5]));
    });

    it('handles partial copies correctly', () => {
      const src = new Float64Array([1, 2, 3, 4]);
      const dst = new Float64Array(4);
      copyVector(src, dst, 2);
      expect(dst).toEqual(new Float64Array([1, 2, 0, 0]));
    });
  });

  describe('copyMatrix', () => {
    it('deep copies a matrix', () => {
      const n = 2;
      const src = createMatrix(n);
      src[0][0] = 1; src[0][1] = 2;
      src[1][0] = 3; src[1][1] = 4;

      const dst = createMatrix(n);
      copyMatrix(src, dst, n);

      expect(dst[0][0]).toBe(1);
      expect(dst[0][1]).toBe(2);
      expect(dst[1][0]).toBe(3);
      expect(dst[1][1]).toBe(4);

      // Verify deep copy
      src[0][0] = 99;
      expect(dst[0][0]).toBe(1);
    });
  });

  describe('LU Factorization and Solve', () => {
    it('identifies a singular matrix (all zeros in a row)', () => {
      const n = 3;
      const matrix = createMatrix(n);
      // Leave matrix as all 0s
      const ipvt = new Array(n).fill(0);
      const success = luFactor(matrix, n, ipvt);
      expect(success).toBe(false);
    });

    it('solves a simple 2x2 system exactly', () => {
      // System:
      // 2x + y = 5
      // 3x - y = 5
      // Solution: x = 2, y = 1
      const n = 2;
      const a = createMatrix(n);
      a[0][0] = 2; a[0][1] = 1;
      a[1][0] = 3; a[1][1] = -1;

      const ipvt = new Array(n).fill(0);
      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      const b = new Float64Array([5, 5]);
      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(2);
      expect(b[1]).toBeCloseTo(1);
    });

    it('solves a 3x3 system requiring pivoting', () => {
      // Cleaner System:
      // 0x + 1y + 1z = 5
      // 2x + 2y + 2z = 12  -> 2x + 2(5) = 12 -> 2x = 2 -> x = 1
      // -1x + 0y + 1z = 2  -> -1(1) + z = 2 -> z = 3 -> y = 2
      //
      // Solution: x = 1, y = 2, z = 3
      const n = 3;
      const a = createMatrix(n);
      a[0][0] = 0; a[0][1] = 1; a[0][2] = 1;
      a[1][0] = 2; a[1][1] = 2; a[1][2] = 2;
      a[2][0] = -1; a[2][1] = 0; a[2][2] = 1;

      const ipvt = new Array(n).fill(0);
      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      const b = new Float64Array([5, 12, 2]);
      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(1);
      expect(b[1]).toBeCloseTo(2);
      expect(b[2]).toBeCloseTo(3);
    });

    it('solves identity matrix system', () => {
      const n = 3;
      const a = createMatrix(n);
      a[0][0] = 1;
      a[1][1] = 1;
      a[2][2] = 1;

      const ipvt = new Array(n).fill(0);
      const success = luFactor(a, n, ipvt);
      expect(success).toBe(true);

      const b = new Float64Array([7, 8, 9]);
      luSolve(a, n, ipvt, b);

      expect(b[0]).toBeCloseTo(7);
      expect(b[1]).toBeCloseTo(8);
      expect(b[2]).toBeCloseTo(9);
    });
  });
});
