import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class SwitchElement extends CircuitElement {
  type = 'switch';
  closed = false;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  stamp(stamper: IStamper): void {
    const r = this.closed ? 0.01 : 1e9;
    stamper.stampResistor(this.nodes[0], this.nodes[1], r);
  }

  toggle(): void {
    this.closed = !this.closed;
  }

  calculateCurrent(): void {
    const vdiff = this.volts[0] - this.volts[1];
    const r = this.closed ? 0.01 : 1e9;
    this.current = vdiff / r;
  }
}
