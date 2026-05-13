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
export function luFactor(a: number[][], n: number, ipvt: number[]): boolean {
  // Check for rows that are all zeros (singular matrix)
  for (let i = 0; i < n; i++) {
    let rowAllZeros = true;
    for (let j = 0; j < n; j++) {
      if (a[i][j] !== 0) {
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
      let q = a[i][j];
      for (let k = 0; k < i; k++) {
        q -= a[i][k] * a[k][j];
      }
      a[i][j] = q;
    }

    // Calculate lower triangular elements for this column
    let largest = 0;
    let largestRow = -1;
    for (let i = j; i < n; i++) {
      let q = a[i][j];
      for (let k = 0; k < j; k++) {
        q -= a[i][k] * a[k][j];
      }
      a[i][j] = q;
      const x = Math.abs(q);
      if (x >= largest) {
        largest = x;
        largestRow = i;
      }
    }

    // Pivoting: swap rows if needed
    if (j !== largestRow) {
      for (let k = 0; k < n; k++) {
        const x = a[largestRow][k];
        a[largestRow][k] = a[j][k];
        a[j][k] = x;
      }
    }

    // Record row interchange
    ipvt[j] = largestRow;

    // Avoid zero pivots
    if (a[j][j] === 0.0) {
      a[j][j] = 1e-18;
    }

    // Scale lower triangular column
    if (j !== n - 1) {
      const mult = 1.0 / a[j][j];
      for (let i = j + 1; i < n; i++) {
        a[i][j] *= mult;
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
export function luSolve(a: number[][], n: number, ipvt: number[], b: number[]): void {
  // Find first nonzero b element
  let i: number;
  for (i = 0; i < n; i++) {
    const row = ipvt[i];
    const swap = b[row];
    b[row] = b[i];
    b[i] = swap;
    if (swap !== 0) break;
  }

  const bi = i++;

  // Forward substitution using lower triangular matrix
  for (; i < n; i++) {
    const row = ipvt[i];
    let tot = b[row];
    b[row] = b[i];
    for (let j = bi; j < i; j++) {
      tot -= a[i][j] * b[j];
    }
    b[i] = tot;
  }

  // Back substitution using upper triangular matrix
  for (i = n - 1; i >= 0; i--) {
    let tot = b[i];
    for (let j = i + 1; j < n; j++) {
      tot -= a[i][j] * b[j];
    }
    b[i] = tot / a[i][i];
  }
}

/**
 * Create a new n×n matrix filled with zeros.
 */
export function createMatrix(n: number): number[][] {
  const m: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    m[i] = new Float64Array(n) as unknown as number[];
  }
  return m;
}

/**
 * Copy matrix src into dst.
 */
export function copyMatrix(src: number[][], dst: number[][], n: number): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      dst[i][j] = src[i][j];
    }
  }
}

/**
 * Copy vector src into dst.
 */
export function copyVector(src: number[], dst: number[], n: number): void {
  for (let i = 0; i < n; i++) {
    dst[i] = src[i];
  }
}
