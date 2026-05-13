import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class CapacitorElement extends CircuitElement {
  type = 'capacitor';
  capacitance = 1e-3; // 1mF default for visible animations
  
  private compResistance = 0;
  private currentSourceValue = 0;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  stamp(stamper: IStamper): void {
    // Trapezoidal rule equivalent resistance: R_eq = dt / (2 * C)
    this.compResistance = stamper.timeStep / (2 * this.capacitance);
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
    // A current source of CS_n from n2 to n1
    stamper.stampCurrentSource(this.nodes[1], this.nodes[0], this.currentSourceValue);
  }

  calculateCurrent(): void {
    const vdiff = this.volts[0] - this.volts[1];
    // i_n = V_n / R_eq - CS_n
    this.current = (vdiff / this.compResistance) - this.currentSourceValue;
  }

  reset(): void {
    super.reset();
    this.currentSourceValue = 0;
  }
}
