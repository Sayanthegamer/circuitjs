// ============================================================
// Resistor Element
// Port of ResistorElm.java
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class ResistorElement extends CircuitElement {
  type = 'resistor';
  resistance: number;

  constructor(x: number, y: number, x2: number, y2: number, resistance = 1000) {
    super(x, y, x2, y2);
    this.resistance = resistance;
  }

  stamp(stamper: IStamper): void {
    stamper.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
  }

  calculateCurrent(): void {
    this.current = (this.volts[0] - this.volts[1]) / this.resistance;
  }

  getInfo(): Record<string, string> {
    return {
      name: 'Resistor',
      resistance: `${this.resistance} Ω`,
      current: `${this.current.toExponential(3)} A`,
      voltageDiff: `${this.getVoltageDiff().toFixed(4)} V`,
      power: `${this.getPower().toExponential(3)} W`,
    };
  }
}
