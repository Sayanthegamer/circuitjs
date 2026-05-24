import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class CurrentSourceElement extends CircuitElement {
  type = 'current_source';
  currentValue: number;

  constructor(x: number, y: number, x2: number, y2: number, currentValue = 0.002) {
    super(x, y, x2, y2);
    this.currentValue = currentValue;
  }

  stamp(stamper: IStamper): void {
    // Independent current source only affects the RHS vector.
    // Call stampRightSide to mark the rows as changing.
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  doStep(stamper: IStamper): void {
    if (stamper.isACSweep) {
      return;
    }
    const scale = (stamper as any).homotopyScale ?? 1.0;
    // Inject the constant current directly into the RHS.
    // Node 0 is source (leaves node), Node 1 is sink (enters node).
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.currentValue * scale);
  }

  calculateCurrent(): void {
    this.current = this.currentValue;
  }

  getInfo(): Record<string, string> {
    return {
      name: 'Independent Current Source',
      current: `${(this.currentValue * 1000).toFixed(3)} mA`,
      voltageDiff: `${this.getVoltageDiff().toFixed(4)} V`,
      power: `${(this.getVoltageDiff() * this.currentValue * 1000).toFixed(3)} mW`,
    };
  }
}
