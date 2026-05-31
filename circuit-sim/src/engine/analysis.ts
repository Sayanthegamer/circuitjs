// ============================================================
// Multi-Mode Simulation Engine (DC OP & AC Sweep Analysis)
// ============================================================

import { Circuit } from './circuit';
import { createMatrix, luFactor, luSolve } from './matrix';
import { CapacitorElement } from './elements/capacitor';
import { InductorElement } from './elements/inductor';
import { VoltageSourceElement } from './elements/voltage-source';

export interface ACSweepPoint {
  freq: number;
  // Node voltages: index 0 is ground (0V), indices 1..N are the node voltages
  voltages: { vReal: number; vImag: number }[];
}

export class ACSweepEngine {
  /**
   * Run an AC Frequency Sweep analysis on the circuit.
   * Computes the complex node voltages (Real/Imaginary) over a frequency range.
   */
  static runSweep(
    circuit: Circuit,
    startFreq: number,
    endFreq: number,
    pointsPerDecade = 10
  ): ACSweepPoint[] {
    if (circuit.elements.length === 0 || circuit.nodeList.length <= 1) {
      return [];
    }

    const results: ACSweepPoint[] = [];

    // Save modes
    const oldACSweep = circuit.isACSweep;
    const oldDCOp = circuit.isDCOperatingPoint;

    circuit.isACSweep = true;
    circuit.isDCOperatingPoint = false;

    // Run stampCircuit to build topology mapping and rowInfo
    (circuit as any).stampCircuit();

    const N = circuit.circuitMatrixSize;
    if (N === 0) {
      circuit.isACSweep = oldACSweep;
      circuit.isDCOperatingPoint = oldDCOp;
      (circuit as any).stampCircuit();
      return [];
    }

    if (!Number.isFinite(startFreq) || startFreq <= 0 ||
        !Number.isFinite(endFreq) || endFreq <= 0 ||
        startFreq >= endFreq ||
        !Number.isFinite(pointsPerDecade) || pointsPerDecade <= 0) {
      throw new Error("Invalid frequency sweep bounds or pointsPerDecade");
    }

    // Spacing points logarithmically
    const logStart = Math.log10(startFreq);
    const logEnd = Math.log10(endFreq);
    const totalDecades = logEnd - logStart;
    const totalPoints = Math.max(2, Math.round(totalDecades * pointsPerDecade) + 1);

    for (let p = 0; p < totalPoints; p++) {
      const t = p / (totalPoints - 1);
      const freq = Math.pow(10, logStart + t * totalDecades);
      const omega = 2 * Math.PI * freq;
      (circuit as any).omega = omega;

      // Re-stamp real components
      (circuit as any).stampCircuit();

      // Allocate complex MNA system 2N x 2N
      const complexMna = createMatrix(2 * N);
      const complexRhs = new Float64Array(2 * N);

      // Copy real parts G into top-left and bottom-right blocks
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          complexMna[i * (2 * N) + j] = circuit.circuitMatrix[i * circuit.circuitMatrixSize + j];
          complexMna[(i + N) * (2 * N) + (j + N)] = circuit.circuitMatrix[i * circuit.circuitMatrixSize + j];
        }
      }

      // Helper to stamp complex susceptance
      const stampComplexConductance = (n1: number, n2: number, B: number) => {
        const stampElement = (row: number, col: number, val: number, block: 'TR' | 'BL') => {
          if (row < 0 || col < 0) return;
          if (block === 'TR') {
            complexMna[row * (2 * N) + (col + N)] += val;
          } else {
            complexMna[(row + N) * (2 * N) + col] += val;
          }
        };

        const idx1 = n1 - 1;
        const idx2 = n2 - 1;

        // Top-Right block (-B)
        stampElement(idx1, idx1, -B, 'TR');
        stampElement(idx2, idx2, -B, 'TR');
        stampElement(idx1, idx2, B, 'TR');
        stampElement(idx2, idx1, B, 'TR');

        // Bottom-Left block (+B)
        stampElement(idx1, idx1, B, 'BL');
        stampElement(idx2, idx2, B, 'BL');
        stampElement(idx1, idx2, -B, 'BL');
        stampElement(idx2, idx1, -B, 'BL');
      };

      // Add capacitor and inductor susceptances
      for (const ce of circuit.elements) {
        if (ce.type === 'capacitor') {
          const cap = ce as CapacitorElement;
          let B = omega * cap.capacitance;
          if (cap.esr > 0) {
            const den = 1 + omega * omega * cap.capacitance * cap.capacitance * cap.esr * cap.esr;
            B = B / den;
          }
          stampComplexConductance(cap.nodes[0], cap.nodes[1], B);
        } else if (ce.type === 'inductor') {
          const ind = ce as InductorElement;
          if ((ind as any).isCoupled) {
            continue;
          }
          if (omega === 0 || !Number.isFinite(omega)) {
            throw new Error("AC sweep frequency must be greater than zero");
          }
          let B = -1 / (omega * ind.inductance);
          if (ind.seriesResistance > 0) {
            const den = ind.seriesResistance * ind.seriesResistance + omega * omega * ind.inductance * ind.inductance;
            B = -omega * ind.inductance / den;
          }
          stampComplexConductance(ind.nodes[0], ind.nodes[1], B);
        } else if (ce.type === 'transformer') {
          const tf = ce as any;
          const [n1a, n1b, n2a, n2b] = tf.nodes;

          const b11 = tf.b11_ac ?? 0;
          const b22 = tf.b22_ac ?? 0;
          const b12 = tf.b12_ac ?? 0;

          stampComplexConductance(n1a, n1b, b11);
          stampComplexConductance(n2a, n2b, b22);

          const stampComplexMatrix = (row: number, col: number, val: number, block: 'TR' | 'BL') => {
            if (row < 0 || col < 0) return;
            if (block === 'TR') {
              complexMna[row * (2 * N) + (col + N)] += val;
            } else {
              complexMna[(row + N) * (2 * N) + col] += val;
            }
          };

          const idx1a = n1a - 1;
          const idx1b = n1b - 1;
          const idx2a = n2a - 1;
          const idx2b = n2b - 1;

          stampComplexMatrix(idx1a, idx2a, -b12, 'TR');
          stampComplexMatrix(idx1b, idx2b, -b12, 'TR');
          stampComplexMatrix(idx1a, idx2b, b12, 'TR');
          stampComplexMatrix(idx1b, idx2a, b12, 'TR');

          stampComplexMatrix(idx2a, idx1a, -b12, 'TR');
          stampComplexMatrix(idx2b, idx1b, -b12, 'TR');
          stampComplexMatrix(idx2a, idx1b, b12, 'TR');
          stampComplexMatrix(idx2b, idx1a, b12, 'TR');

          stampComplexMatrix(idx1a, idx2a, b12, 'BL');
          stampComplexMatrix(idx1b, idx2b, b12, 'BL');
          stampComplexMatrix(idx1a, idx2b, -b12, 'BL');
          stampComplexMatrix(idx1b, idx2a, -b12, 'BL');

          stampComplexMatrix(idx2a, idx1a, b12, 'BL');
          stampComplexMatrix(idx2b, idx1b, b12, 'BL');
          stampComplexMatrix(idx2a, idx1b, -b12, 'BL');
          stampComplexMatrix(idx2b, idx1a, -b12, 'BL');
        }
      }

      // Stamp active AC voltage source excitation into Real RHS
      for (let ji = 0; ji < circuit.voltageSourceCount; ji++) {
        const vs = circuit.voltageSources[ji];
        if (vs instanceof VoltageSourceElement && vs.waveform === 'AC') {
          const row = circuit.nodeList.length - 1 + ji;
          if (row < N) {
            complexRhs[row] = vs.maxVoltage;
          }
        }
      }

      // Solve complex linear system of size 2N
      const ipvt: number[] = new Array(2 * N);
      if (!luFactor(complexMna, 2 * N, ipvt)) {
        continue;
      }

      luSolve(complexMna, 2 * N, ipvt, complexRhs);

      // Collect voltages for all nodes
      const voltages: { vReal: number; vImag: number }[] = [];
      voltages.push({ vReal: 0, vImag: 0 }); // Ground is always 0V

      for (let j = 1; j < circuit.nodeList.length; j++) {
        const idx = j - 1;
        const vReal = complexRhs[idx];
        const vImag = complexRhs[idx + N];
        voltages.push({ vReal, vImag });
      }

      results.push({
        freq,
        voltages,
      });
    }

    // Restore mode flags
    circuit.isACSweep = oldACSweep;
    circuit.isDCOperatingPoint = oldDCOp;
    (circuit as any).stampCircuit();

    return results;
  }
}
