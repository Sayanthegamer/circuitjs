// ============================================================
// Ground Element
// When a ground element exists, its post is mapped to node 0
// during the analysis phase — no stamp needed.
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class GroundElement extends CircuitElement {
  type = 'ground';

  constructor(x: number, y: number) {
    super(x, y, x, y);
  }

  getPostCount(): number { return 1; }

  // Ground doesn't add a voltage source row — instead, during analyzeCircuit,
  // its post is assigned to node 0 directly via setGroundNode().
  getVoltageSourceCount(): number { return 0; }

  stamp(_stamper: IStamper): void {
    // No stamp needed. The ground's post IS node 0.
  }

  hasGroundConnection(_n: number): boolean { return true; }

  getConnection(_n1: number, _n2: number): boolean { return true; }

  calculateCurrent(): void { }
}
