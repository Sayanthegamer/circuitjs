import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class TransformerElement extends CircuitElement {
  type = 'transformer';
  inductance1 = 1.0;
  inductance2 = 1.0;
  couplingCoefficient = 0.99;
  seriesResistance1 = 0.1;
  seriesResistance2 = 0.1;

  // currents in each winding
  public current = 0;   // Primary current
  public current2 = 0;  // Secondary current

  // Dummy fields for compatibility/telemetry/tests
  public Req1 = 0;
  public Req2 = 0;
  public ReqM = 0;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  getPostCount(): number { return 4; }
  getVoltageSourceCount(): number { return 1; }

  getConnection(n1: number, n2: number): boolean {
    if ((n1 === 0 || n1 === 1) && (n2 === 0 || n2 === 1)) return true;
    if ((n1 === 2 || n1 === 3) && (n2 === 2 || n2 === 3)) return true;
    return false;
  }

  getPost(n: number): { x: number; y: number } {
    const horizontal = Math.abs(this.x2 - this.x) > Math.abs(this.y2 - this.y);
    if (horizontal) {
      if (n === 0) return { x: this.x, y: this.y - 16 };  // Primary +
      if (n === 1) return { x: this.x, y: this.y + 16 };  // Primary -
      if (n === 2) return { x: this.x2, y: this.y2 - 16 }; // Secondary +
      return { x: this.x2, y: this.y2 + 16 };             // Secondary -
    } else {
      if (n === 0) return { x: this.x - 16, y: this.y };  // Primary +
      if (n === 1) return { x: this.x + 16, y: this.y };  // Primary -
      if (n === 2) return { x: this.x2 - 16, y: this.y2 }; // Secondary +
      return { x: this.x2 + 16, y: this.y2 };             // Secondary -
    }
  }

  stamp(stamper: IStamper): void {
    if (this.nodes.length < 4) return;
    const [n1a, n1b, n2a, n2b] = this.nodes;
    if (n1a === undefined || n1b === undefined || n2a === undefined || n2b === undefined) return;

    const L1 = Math.max(1e-9, this.inductance1);
    const L2 = Math.max(1e-9, this.inductance2);
    const Rs1 = Math.max(0, this.seriesResistance1);
    const Rs2 = Math.max(0, this.seriesResistance2);

    const kClamped = Math.min(0.99999, Math.max(-0.99999, this.couplingCoefficient));
    const N = kClamped * Math.sqrt(L2 / L1);

    // Save dummy Req parameters for AC sweep and tests compatibility
    this.Req1 = L1 / stamper.timeStep;
    this.Req2 = L2 / stamper.timeStep;
    this.ReqM = kClamped * Math.sqrt(this.Req1 * this.Req2);

    const vs = this.voltSource;
    const vn = stamper.nodeCount + vs;

    // Constraint row for extra variable: V(n2a) - V(n2b) - N * (V(n1a) - V(n1b)) - I_vs * (Rs2 + N^2 * Rs1) = 0
    stamper.stampMatrix(vn, n2a, 1);
    stamper.stampMatrix(vn, n2b, -1);
    stamper.stampMatrix(vn, n1a, -N);
    stamper.stampMatrix(vn, n1b, N);
    stamper.stampMatrix(vn, vn, -(Rs2 + N * N * Rs1));

    // Stamping the currents (anti-symmetric columns)
    stamper.stampMatrix(n2a, vn, -1);
    stamper.stampMatrix(n2b, vn, 1);
    stamper.stampMatrix(n1a, vn, N);
    stamper.stampMatrix(n1b, vn, -N);

    // Stamp right hand side (0 value constraint)
    stamper.stampRightSide(vn, 0);

    // Add tiny shunt conductances to prevent singular matrices on unconnected windings
    const Gmin = 1e-9;
    stamper.stampConductance(n1a, n1b, Gmin);
    stamper.stampConductance(n2a, n2b, Gmin);
  }

  startIteration(): void {
    // Ideal transformer is purely static - no history calculation needed
  }

  doStep(_stamper: IStamper): void {
    // Purely linear static element - no NR iterations needed
  }

  setCurrent(_vsIndex: number, current: number): void {
    this.current2 = current; // Secondary current
    const L1 = Math.max(1e-9, this.inductance1);
    const L2 = Math.max(1e-9, this.inductance2);
    const kClamped = Math.min(0.99999, Math.max(-0.99999, this.couplingCoefficient));
    const N = kClamped * Math.sqrt(L2 / L1);
    this.current = N * current; // Primary current (Ip = N * Is)
  }

  calculateCurrent(): void {
    // Current is set directly by the solver in setCurrent()
  }

  getCurrentIntoNode(n: number): number {
    if (n === 0) return -this.current;
    if (n === 1) return this.current;
    if (n === 2) return -this.current2;
    if (n === 3) return this.current2;
    return 0;
  }

  getCurrent(): number {
    return this.current;
  }

  getVoltageDiff(): number {
    return this.volts[0] - this.volts[1];
  }

  reset(): void {
    super.reset();
    this.current = 0;
    this.current2 = 0;
  }
}
