import { describe, it, expect } from 'vitest';
import { createMatrix, copyMatrix, copyVector } from './matrix';

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
