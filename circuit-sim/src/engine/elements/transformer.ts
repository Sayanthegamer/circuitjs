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

  // Req parameters for transient/AC compatibility
  public Req1 = 0;
  public Req2 = 0;
  public ReqM = 0;

  // AC susceptance fields
  public b11_ac = 0;
  public b22_ac = 0;
  public b12_ac = 0;

  // Conductance matrix values computed during stamp()
  private g11 = 0;
  private g22 = 0;
  private g12 = 0;

  // Companion currents computed during startIteration()
  private iComp1 = 0;
  private iComp2 = 0;
  private lastIsEuler = false;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  getPostCount(): number { return 4; }
  getVoltageSourceCount(): number { return 0; }

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
    const M = kClamped * Math.sqrt(L1 * L2);

    if (stamper.isDCOperatingPoint) {
      stamper.stampResistor(n1a, n1b, Math.max(1e-6, Rs1));
      stamper.stampResistor(n2a, n2b, Math.max(1e-6, Rs2));
      return;
    }

    if (stamper.isACSweep) {
      const omega = (stamper as any).omega ?? 0;
      if (omega === 0) return;

      const rReal = Rs1 * Rs2 - omega * omega * (L1 * L2 - M * M);
      const rImag = omega * (L1 * Rs2 + L2 * Rs1);
      const den = rReal * rReal + rImag * rImag;

      if (den === 0) return;

      const g11 = (Rs2 * rReal + omega * L2 * rImag) / den;
      const b11 = (omega * L2 * rReal - Rs2 * rImag) / den;

      const g22 = (Rs1 * rReal + omega * L1 * rImag) / den;
      const b22 = (omega * L1 * rReal - Rs1 * rImag) / den;

      const g12 = (-omega * M * rImag) / den;
      const b12 = (-omega * M * rReal) / den;

      stamper.stampConductance(n1a, n1b, g11);
      stamper.stampConductance(n2a, n2b, g22);

      stamper.stampMatrix(n1a, n2a, g12);
      stamper.stampMatrix(n1b, n2b, g12);
      stamper.stampMatrix(n1a, n2b, -g12);
      stamper.stampMatrix(n1b, n2a, -g12);

      stamper.stampMatrix(n2a, n1a, g12);
      stamper.stampMatrix(n2b, n1b, g12);
      stamper.stampMatrix(n2a, n1b, -g12);
      stamper.stampMatrix(n2b, n1a, -g12);

      this.b11_ac = b11;
      this.b22_ac = b22;
      this.b12_ac = b12;

      const Gmin = 1e-9;
      stamper.stampConductance(n1a, n1b, Gmin);
      stamper.stampConductance(n2a, n2b, Gmin);
      return;
    }

    const isEuler = !!stamper.isBackwardEuler;
    this.lastIsEuler = isEuler;

    const Req1 = isEuler ? L1 / stamper.timeStep : (2.0 * L1) / stamper.timeStep;
    const Req2 = isEuler ? L2 / stamper.timeStep : (2.0 * L2) / stamper.timeStep;
    const ReqM = isEuler ? M / stamper.timeStep : (2.0 * M) / stamper.timeStep;

    this.Req1 = Req1;
    this.Req2 = Req2;
    this.ReqM = ReqM;

    const Rtot11 = Req1 + Rs1;
    const Rtot22 = Req2 + Rs2;
    const Rtot12 = ReqM;

    const det = Rtot11 * Rtot22 - Rtot12 * Rtot12;
    if (det === 0) return;

    this.g11 = Rtot22 / det;
    this.g22 = Rtot11 / det;
    this.g12 = -Rtot12 / det;

    stamper.stampConductance(n1a, n1b, this.g11);
    stamper.stampConductance(n2a, n2b, this.g22);

    stamper.stampMatrix(n1a, n2a, this.g12);
    stamper.stampMatrix(n1b, n2b, this.g12);
    stamper.stampMatrix(n1a, n2b, -this.g12);
    stamper.stampMatrix(n1b, n2a, -this.g12);

    stamper.stampMatrix(n2a, n1a, this.g12);
    stamper.stampMatrix(n2b, n1b, this.g12);
    stamper.stampMatrix(n2a, n1b, -this.g12);
    stamper.stampMatrix(n2b, n1a, -this.g12);

    stamper.stampRightSide(n1a);
    stamper.stampRightSide(n1b);
    stamper.stampRightSide(n2a);
    stamper.stampRightSide(n2b);

    const Gmin = 1e-9;
    stamper.stampConductance(n1a, n1b, Gmin);
    stamper.stampConductance(n2a, n2b, Gmin);
  }

  startIteration(): void {
    const Rs1 = Math.max(0, this.seriesResistance1);
    const Rs2 = Math.max(0, this.seriesResistance2);

    const v1prev = this.volts[0] - this.volts[1];
    const v2prev = this.volts[2] - this.volts[3];
    const i1prev = this.current;
    const i2prev = this.current2;

    const vL1prev = v1prev - i1prev * Rs1;
    const vL2prev = v2prev - i2prev * Rs2;

    let vhist1: number;
    let vhist2: number;

    if (this.lastIsEuler) {
      vhist1 = -this.Req1 * i1prev - this.ReqM * i2prev;
      vhist2 = -this.ReqM * i1prev - this.Req2 * i2prev;
    } else {
      vhist1 = -vL1prev - this.Req1 * i1prev - this.ReqM * i2prev;
      vhist2 = -vL2prev - this.ReqM * i1prev - this.Req2 * i2prev;
    }

    this.iComp1 = -(this.g11 * vhist1 + this.g12 * vhist2);
    this.iComp2 = -(this.g12 * vhist1 + this.g22 * vhist2);
  }

  doStep(stamper: IStamper): void {
    if (stamper.isDCOperatingPoint || stamper.isACSweep) return;
    const [n1a, n1b, n2a, n2b] = this.nodes;
    stamper.stampCurrentSource(n1a, n1b, this.iComp1);
    stamper.stampCurrentSource(n2a, n2b, this.iComp2);
  }

  calculateCurrent(): void {
    const v1 = this.volts[0] - this.volts[1];
    const v2 = this.volts[2] - this.volts[3];

    this.current = this.g11 * v1 + this.g12 * v2 + this.iComp1;
    this.current2 = this.g12 * v1 + this.g22 * v2 + this.iComp2;
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
    this.iComp1 = 0;
    this.iComp2 = 0;
  }
}
