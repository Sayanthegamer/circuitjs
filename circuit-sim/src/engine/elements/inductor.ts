import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class InductorElement extends CircuitElement {
  type = 'inductor';
  inductance = 1; // 1 Henry default
  public seriesResistance = 0.1; // 0.1 Ohms default series winding resistance
  public isCoupled = false; // Flag set by MutualCouplingElement overlay

  private compResistance = 0;
  private currentSourceValue = 0;
  private lastIsEuler = false;

  constructor(x: number, y: number, x2: number, y2: number, inductance = 1) {
    super(x, y, x2, y2);
    this.inductance = inductance;
  }

  stamp(stamper: IStamper): void {
    if (this.isCoupled) {
      return;
    }

    if (stamper.isDCOperatingPoint) {
      stamper.stampResistor(this.nodes[0], this.nodes[1], Math.max(1e-6, this.seriesResistance));
      return;
    }

    if (stamper.isACSweep) {
      const omega = (stamper as any).omega ?? 0;
      if (this.seriesResistance === 0) {
        return;
      }
      const num = this.seriesResistance;
      const den = this.seriesResistance * this.seriesResistance + omega * omega * this.inductance * this.inductance;
      const G = num / den;
      stamper.stampConductance(this.nodes[0], this.nodes[1], G);
      return;
    }

    const isEuler = !!stamper.isBackwardEuler;
    this.lastIsEuler = isEuler;

    // Ideal inductor companion resistance: R_ideal = L / dt (Euler) or 2L / dt (Trapezoidal)
    const activeIndResistance = isEuler
      ? this.inductance / stamper.timeStep
      : (2.0 * this.inductance) / stamper.timeStep;

    // Total companion resistance includes series winding resistance
    this.compResistance = activeIndResistance + this.seriesResistance;

    stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  startIteration(): void {
    if (this.isCoupled) {
      return;
    }

    const vdiff = this.volts[0] - this.volts[1];
    const isEuler = this.lastIsEuler;
    const rIdeal = this.compResistance - this.seriesResistance;
    const vIdeal = vdiff - 2.0 * this.current * this.seriesResistance;

    if (isEuler) {
      this.currentSourceValue = this.current * (rIdeal / this.compResistance);
    } else {
      this.currentSourceValue = (vIdeal / this.compResistance) + this.current;
    }
  }

  doStep(stamper: IStamper): void {
    if (this.isCoupled) {
      return;
    }

    if (stamper.isDCOperatingPoint || stamper.isACSweep) {
      return;
    }
    // A current source of CS_n from n0 to n1
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.currentSourceValue);
  }

  calculateCurrent(): void {
    if (this.isCoupled) {
      return;
    }

    const vdiff = this.volts[0] - this.volts[1];
    // i_n = V_n / R_eq + CS_n
    this.current = (vdiff / this.compResistance) + this.currentSourceValue;
  }

  reset(): void {
    super.reset();
    this.currentSourceValue = 0;
    this.isCoupled = false;
  }
}
