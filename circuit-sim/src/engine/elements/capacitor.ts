import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class CapacitorElement extends CircuitElement {
  type = 'capacitor';
  capacitance = 1e-3;
  public esr = 0.05; // 0.05 Ohms default ESR

  private compResistance = 0;
  private currentSourceValue = 0;
  private lastIsEuler = false;

  constructor(x: number, y: number, x2: number, y2: number, capacitance = 1e-3) {
    super(x, y, x2, y2);
    this.capacitance = capacitance;
  }

  stamp(stamper: IStamper): void {
    if (stamper.isDCOperatingPoint) {
      stamper.stampResistor(this.nodes[0], this.nodes[1], 1e12);
      return;
    }

    if (stamper.isACSweep) {
      const omega = (stamper as any).omega ?? 0;
      if (omega === 0 || this.esr === 0) {
        return;
      }
      const num = omega * omega * this.capacitance * this.capacitance * this.esr;
      const den = 1 + omega * omega * this.capacitance * this.capacitance * this.esr * this.esr;
      const G = num / den;
      stamper.stampConductance(this.nodes[0], this.nodes[1], G);
      return;
    }

    const isEuler = !!stamper.isBackwardEuler;
    this.lastIsEuler = isEuler;

    // Ideal cap resistance: R_ideal = dt / C (Euler) or dt / 2C (Trapezoidal)
    const activeCapResistance = isEuler
      ? stamper.timeStep / this.capacitance
      : stamper.timeStep / (2 * this.capacitance);

    // Total companion resistance includes ESR
    this.compResistance = activeCapResistance + this.esr;

    stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  startIteration(): void {
    const vdiff = this.volts[0] - this.volts[1];
    const isEuler = this.lastIsEuler;
    const vIdeal = vdiff - 2.0 * this.current * this.esr;

    if (isEuler) {
      this.currentSourceValue = (vdiff - this.current * this.esr) / this.compResistance;
    } else {
      this.currentSourceValue = (vIdeal / this.compResistance) + this.current;
    }
  }

  doStep(stamper: IStamper): void {
    if (stamper.isDCOperatingPoint || stamper.isACSweep) {
      return;
    }
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], -this.currentSourceValue);
  }

  calculateCurrent(): void {
    const vdiff = this.volts[0] - this.volts[1];
    this.current = (vdiff / this.compResistance) - this.currentSourceValue;
  }

  reset(): void {
    super.reset();
    this.currentSourceValue = 0;
  }
}
