// ============================================================
// DC Voltage Source Element
// Port of VoltageElm.java (DC mode only for Phase 1)
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class VoltageSourceElement extends CircuitElement {
  type = 'voltage';
  maxVoltage: number;

  constructor(x: number, y: number, x2: number, y2: number, voltage = 5) {
    super(x, y, x2, y2);
    this.maxVoltage = voltage;
  }

  getVoltageSourceCount(): number { return 1; }

  stamp(stamper: IStamper): void {
    stamper.stampVoltageSource(
      this.nodes[0], this.nodes[1], this.voltSource, this.maxVoltage
    );
  }

  // Voltage source current is set by the matrix solver via setCurrent()
  calculateCurrent(): void { /* current set by solver */ }

  getVoltageDiff(): number { return this.volts[1] - this.volts[0]; }

  getPower(): number { return -this.getVoltageDiff() * this.current; }

  getInfo(): Record<string, string> {
    return {
      name: 'DC Voltage Source',
      voltage: `${this.maxVoltage} V`,
      current: `${this.current.toExponential(3)} A`,
      power: `${this.getPower().toExponential(3)} W`,
    };
  }
}
