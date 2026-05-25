// ============================================================
// Transformer Element (Unified 4-terminal Coupled Inductors)
// ============================================================

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

  // Conductance matrix values computed during stamp()
  private g11 = 0;
  private g22 = 0;
  private g12 = 0;

  // Companion currents computed during startIteration()
  private iComp1 = 0;
  private iComp2 = 0;

  // Saved Req parameters for startIteration history computation
  private Req1 = 0;
  private Req2 = 0;
  private ReqM = 0;
  private lastIsEuler = false;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  getPostCount(): number { return 4; }
  getVoltageSourceCount(): number { return 0; }

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
    const L1 = this.inductance1;
    const L2 = this.inductance2;
    const Rs1 = this.seriesResistance1;
    const Rs2 = this.seriesResistance2;

    const kClamped = Math.min(0.99999, Math.max(-0.99999, this.couplingCoefficient));
    const M = kClamped * Math.sqrt(L1 * L2);

    if (stamper.isDCOperatingPoint) {
      // In DC operating point, inductors are modeled as their series resistances.
      stamper.stampResistor(this.nodes[0], this.nodes[1], Math.max(1e-6, Rs1));
      stamper.stampResistor(this.nodes[2], this.nodes[3], Math.max(1e-6, Rs2));
      return;
    }

    if (stamper.isACSweep) {
      // In AC Sweep, we stamp the coupled complex admittance:
      // Z = [Rs1 + j*omega*L1,   j*omega*M]
      //     [j*omega*M,   Rs2 + j*omega*L2]
      // Let's compute the complex impedance matrix Z and invert it to get Y = G + jB.
      const omega = (stamper as any).omega ?? 0;

      // Z elements:
      // Z11 = Rs1 + j * omega * L1
      // Z22 = Rs2 + j * omega * L2
      // Z12 = j * omega * M
      // Det = Z11 * Z22 - Z12^2
      //     = (Rs1 * Rs2 - omega^2 * (L1 * L2 - M * M)) + j * omega * (L1 * Rs2 + L2 * Rs1)
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

      const [n1a, n1b, n2a, n2b] = this.nodes;

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

      // Save complex susceptance values for the complex AC solver
      (this as any).b11_ac = b11;
      (this as any).b22_ac = b22;
      (this as any).b12_ac = b12;
      return;
    }

    // Transient stamp
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

    const [n1a, n1b, n2a, n2b] = this.nodes;

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
  }

  startIteration(): void {
    const Rs1 = this.seriesResistance1;
    const Rs2 = this.seriesResistance2;

    const v1prev = this.volts[0] - this.volts[1];
    const v2prev = this.volts[2] - this.volts[3];
    const i1prev = this.current;
    const i2prev = this.current2;

    const vL1prev = v1prev - i1prev * Rs1;
    const vL2prev = v2prev - i2prev * Rs2;

    let vhist1 = 0;
    let vhist2 = 0;

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
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.iComp1);
    stamper.stampCurrentSource(this.nodes[2], this.nodes[3], this.iComp2);
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
