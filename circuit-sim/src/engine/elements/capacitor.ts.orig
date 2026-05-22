import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class CapacitorElement extends CircuitElement {
  type = 'capacitor';
  capacitance = 1e-3;
  public esr = 0.1; // Add explicit physical ESR to cap loops to absorb initial macro-inrush surges

  private compResistance = 0;
  private currentSourceValue = 0;

  constructor(x: number, y: number, x2: number, y2: number, capacitance = 1e-3) {
    super(x, y, x2, y2);
    this.capacitance = capacitance;
  }

  stamp(stamper: IStamper): void {
    const isEuler = (stamper as unknown as Record<string, unknown>).isBackwardEuler;

    // Dynamically alternate integration rules to smooth structural switches
    const activeCapResistance = isEuler
      ? stamper.timeStep / this.capacitance
      : stamper.timeStep / (2 * this.capacitance);

    this.compResistance = activeCapResistance + this.esr;

    stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  startIteration(): void {
    const vdiff = this.volts[0] - this.volts[1];

    // Evaluate current rule state via math properties
    const isEuler = this.compResistance > (5e-6 / (1.5 * this.capacitance));

    if (isEuler) {
      this.currentSourceValue = (vdiff / this.compResistance);
    } else {
      this.currentSourceValue = (vdiff / this.compResistance) + this.current;
    }
  }

  doStep(stamper: IStamper): void {
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
