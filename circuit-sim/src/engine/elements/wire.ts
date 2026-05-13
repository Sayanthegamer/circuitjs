// ============================================================
// Wire Element
// Port of WireElm.java
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class WireElement extends CircuitElement {
  type = 'wire';

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  isWire(): boolean { return true; }

  // Wires are eliminated from the matrix during wire closure optimization.
  // They don't stamp anything.
  stamp(_stamper: IStamper): void { /* no-op */ }

  getVoltageDiff(): number { return 0; }

  // Wire current is calculated by the wire optimizer from neighbor currents
  calculateCurrent(): void { /* handled by wire optimizer */ }
}
