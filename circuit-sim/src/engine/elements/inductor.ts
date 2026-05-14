import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class InductorElement extends CircuitElement {
  type = 'inductor';
  inductance = 1; // 1 Henry default
  
  private compResistance = 0;
  private currentSourceValue = 0;

  constructor(x: number, y: number, x2: number, y2: number, inductance = 1) {
    super(x, y, x2, y2);
    this.inductance = inductance;
  }

  stamp(stamper: IStamper): void {
    // Trapezoidal rule equivalent resistance: R_eq = 2 * L / dt
    this.compResistance = (2.0 * this.inductance) / stamper.timeStep;
    stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  startIteration(): void {
    const vdiff = this.volts[0] - this.volts[1];
    // CS_n = V_{n-1} / R_eq + i_{n-1}
    this.currentSourceValue = (vdiff / this.compResistance) + this.current;
  }

  doStep(stamper: IStamper): void {
    // A current source of CS_n from n0 to n1
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.currentSourceValue);
  }

  calculateCurrent(): void {
    const vdiff = this.volts[0] - this.volts[1];
    // i_n = V_n / R_eq + CS_n
    this.current = (vdiff / this.compResistance) + this.currentSourceValue;
  }

  reset(): void {
    super.reset();
    this.currentSourceValue = 0;
  }
}
