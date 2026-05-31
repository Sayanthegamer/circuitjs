// ============================================================
// LU Factorization & Solve
// Direct port from CirSim.java (Crout's method with partial pivoting)
// ============================================================

/**
 * LU factorization of matrix `a` in place.
 * Uses Crout's method with partial pivoting.
 * 
 * @param a - n×n matrix (modified in place to contain L and U)
 * @param n - matrix dimension
 * @param ipvt - output permutation vector (size n)
 * @returns true if successful, false if matrix is singular
 */
export function luFactor(a: Float64Array, n: number, ipvt: number[]): boolean {
  // Check for rows that are all zeros (singular matrix)
  for (let i = 0; i < n; i++) {
    let rowAllZeros = true;
    for (let j = 0; j < n; j++) {
      if (a[i * n + j] !== 0) {
        rowAllZeros = false;
        break;
      }
    }
    if (rowAllZeros) return false;
  }

  // Crout's method: loop through columns
  for (let j = 0; j < n; j++) {
    // Calculate upper triangular elements for this column
    for (let i = 0; i < j; i++) {
      let q = a[i * n + j];
      for (let k = 0; k < i; k++) {
        q -= a[i * n + k] * a[k * n + j];
      }
      a[i * n + j] = q;
    }

    // Calculate lower triangular elements for this column
    let largest = 0;
    let largestRow = -1;
    for (let i = j; i < n; i++) {
      let q = a[i * n + j];
      for (let k = 0; k < j; k++) {
        q -= a[i * n + k] * a[k * n + j];
      }
      a[i * n + j] = q;
      const x = Math.abs(q);
      if (x >= largest) {
        largest = x;
        largestRow = i;
      }
    }

    // Pivoting: swap rows if needed
    if (j !== largestRow) {
      for (let k = 0; k < n; k++) {
        const x = a[largestRow * n + k];
        a[largestRow * n + k] = a[j * n + k];
        a[j * n + k] = x;
      }
    }

    // Record row interchange
    ipvt[j] = largestRow;

    // Avoid zero pivots
    if (a[j * n + j] === 0.0) {
      a[j * n + j] = 1e-18;
    }

    // Scale lower triangular column
    if (j !== n - 1) {
      const mult = 1.0 / a[j * n + j];
      for (let i = j + 1; i < n; i++) {
        a[i * n + j] *= mult;
      }
    }
  }
  return true;
}

/**
 * Solve the system Ax = b using LU factorization.
 * The solution replaces b in place.
 * 
 * @param a - LU-factored matrix from luFactor()
 * @param n - matrix dimension
 * @param ipvt - permutation vector from luFactor()
 * @param b - right-hand side vector (replaced with solution)
 */
export function luSolve(a: Float64Array, n: number, ipvt: number[], b: number[] | Float64Array): void {
  // Step 1: Permute b
  for (let i = 0; i < n; i++) {
    const row = ipvt[i];
    if (row !== i) {
      const swap = b[row];
      b[row] = b[i];
      b[i] = swap;
    }
  }

  // Step 2: Forward substitution using lower triangular matrix
  // Find first nonzero b element
  let bi = 0;
  while (bi < n && b[bi] === 0) {
    bi++;
  }

  for (let i = bi + 1; i < n; i++) {
    let tot = b[i];
    for (let j = bi; j < i; j++) {
      tot -= a[i * n + j] * b[j];
    }
    b[i] = tot;
  }

  // Step 3: Back substitution using upper triangular matrix
  for (let i = n - 1; i >= 0; i--) {
    let tot = b[i];
    for (let j = i + 1; j < n; j++) {
      tot -= a[i * n + j] * b[j];
    }
    b[i] = tot / a[i * n + i];
  }
}

/**
 * Create a new n×n matrix filled with zeros.
 */
export function createMatrix(n: number): Float64Array {
  return new Float64Array(n * n);
}

/**
 * Copy matrix src into dst.
 */
export function copyMatrix(src: Float64Array, dst: Float64Array, _n: number): void {
  dst.set(src);
}

/**
 * Copy vector src into dst.
 */
export function copyVector(src: number[] | Float64Array, dst: number[] | Float64Array, n: number): void {
  if (src instanceof Float64Array && dst instanceof Float64Array) {
    if (n === src.length) {
      dst.set(src);
    } else {
      dst.set(src.subarray(0, n));
    }
  } else {
    for (let i = 0; i < n; i++) {
      dst[i] = src[i];
    }
  }
}
