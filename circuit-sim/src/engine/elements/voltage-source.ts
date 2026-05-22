// ============================================================
// AC/DC Voltage Source Element
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class VoltageSourceElement extends CircuitElement {
  type = 'voltage';
  maxVoltage: number;
  waveform: 'DC' | 'AC' = 'DC';
  frequency: number = 40; // Hz

  constructor(x: number, y: number, x2: number, y2: number, voltage = 5) {
    super(x, y, x2, y2);
    this.maxVoltage = voltage;
  }

  getVoltageSourceCount(): number { return 1; }

  nonLinear(): boolean { return false; }

  getVoltage(t: number): number {
    if (this.waveform === 'DC') {
      return this.maxVoltage;
    } else {
      const safeFrequency = (Number.isFinite(this.frequency) && this.frequency > 0) ? this.frequency : 1;
      return Math.sin(2 * Math.PI * safeFrequency * t) * this.maxVoltage;
    }
  }

  stamp(stamper: IStamper): void {
    if (this.waveform === 'DC') {
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.maxVoltage);
    } else {
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
    }
  }

  doStep(stamper: IStamper): void {
    if (this.waveform === 'AC') {
      stamper.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage(stamper.t));
    }
  }

  // Voltage source current is set by the matrix solver via setCurrent()
  calculateCurrent(): void { /* current set by solver */ }

  getVoltageDiff(): number { return this.volts[1] - this.volts[0]; }

  getPower(): number { return -this.getVoltageDiff() * this.current; }

  getInfo(): Record<string, string> {
    return {
      name: this.waveform === 'DC' ? 'DC Voltage Source' : 'AC Voltage Source',
      voltage: `${this.maxVoltage} V`,
      frequency: this.waveform === 'AC' ? `${this.frequency} Hz` : 'N/A',
      current: `${this.current.toExponential(3)} A`,
      power: `${this.getPower().toExponential(3)} W`,
    };
  }
}
