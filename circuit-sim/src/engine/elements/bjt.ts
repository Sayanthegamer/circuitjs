import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class BJTElement extends CircuitElement {
  type = 'bjt';
  isNpn = true;
  vt = 0.02585;
  is = 1e-14;  // Saturation current (Is)
  bf = 100;    // Forward Beta (Bf)
  br = 1;      // Reverse Beta (Br)

  // History tracking for convergence and step limiting
  lastVbe = 0;
  lastVbc = 0;

  constructor(x: number, y: number, x2: number, y2: number, isNpn = true) {
    super(x, y, x2, y2);
    this.isNpn = isNpn;
  }

  getPostCount(): number { return 3; }
  getInternalNodeCount(): number { return 0; }
  getVoltageSourceCount(): number { return 0; }
  nonLinear(): boolean { return true; }

  /**
   * Layout:
   * Post 0: Collector
   * Post 1: Base
   * Post 2: Emitter
   * 
   * Geometrically:
   * (x, y) is the Base.
   * (x2, y2) is the Emitter.
   * Collector is located symmetrically or offset.
   */
  getPost(n: number): { x: number; y: number } {
    const horizontal = Math.abs(this.x2 - this.x) > Math.abs(this.y2 - this.y);
    if (horizontal) {
      if (n === 0) return { x: this.x2, y: this.y - 32 }; // Collector
      if (n === 1) return { x: this.x, y: this.y };       // Base
      return { x: this.x2, y: this.y + 32 };              // Emitter
    } else {
      if (n === 0) return { x: this.x - 32, y: this.y2 }; // Collector
      if (n === 1) return { x: this.x, y: this.y };       // Base
      return { x: this.x + 32, y: this.y2 };              // Emitter
    }
  }

  stamp(stamper: IStamper): void {
    // Stamp all three connection nodes as non-linear
    stamper.stampNonLinear(this.nodes[0]); // Collector
    stamper.stampNonLinear(this.nodes[1]); // Base
    stamper.stampNonLinear(this.nodes[2]); // Emitter
  }

  private limitStep(vnew: number, vold: number): number {
    const vcrit = this.vt * Math.log(this.vt / (Math.SQRT2 * this.is));
    if (vnew <= vcrit || Math.abs(vnew - vold) <= (this.vt + this.vt)) {
      return vnew;
    }
    if (vold > 0) {
      const arg = 1 + (vnew - vold) / this.vt;
      if (arg > 0) {
        return vold + this.vt * Math.log(arg);
      }
      return vcrit;
    }
    return vcrit;
  }

  doStep(stamper: IStamper): void {
    const vC = this.volts[0];
    const vB = this.volts[1];
    const vE = this.volts[2];

    const s = this.isNpn ? 1 : -1;

    // Junction voltages relative to NPN representation
    const vbeRaw = s * (vB - vE);
    const vbcRaw = s * (vB - vC);

    // Limit voltage steps to prevent exponential blowup
    let vbe = this.limitStep(vbeRaw, this.lastVbe);
    let vbc = this.limitStep(vbcRaw, this.lastVbc);

    // Safety clamps
    const maxVf = 150 * this.vt;
    if (vbe > maxVf) vbe = maxVf;
    if (vbe < -1500) vbe = -1500;
    if (vbc > maxVf) vbc = maxVf;
    if (vbc < -1500) vbc = -1500;

    // Check convergence
    if (Math.abs(vbe - this.lastVbe) > 1e-4 || Math.abs(vbc - this.lastVbc) > 1e-4) {
      stamper.converged = false;
    }

    this.lastVbe = vbe;
    this.lastVbc = vbc;

    // Ebers-Moll forward and reverse exponents
    const expBe = Math.exp(vbe / this.vt);
    const expBc = Math.exp(vbc / this.vt);

    // Ideal junction currents
    const alphaF = this.bf / (1 + this.bf);
    const alphaR = this.br / (1 + this.br);

    const Ies = this.is / alphaF;
    const Ics = this.is / alphaR;

    const If = Ies * (expBe - 1);
    const Ir = Ics * (expBc - 1);

    // Small-signal conductances
    let gbe = (Ies / this.vt) * expBe;
    let gbc = (Ics / this.vt) * expBc;

    // Numerical stability floor (gmin)
    if (gbe < 1e-12) gbe = 1e-12;
    if (gbc < 1e-12) gbc = 1e-12;

    // Norton companion current values
    const If_eq = If - gbe * vbe;
    const Ir_eq = Ir - gbc * vbc;

    const cc = s * (alphaF * If_eq - Ir_eq);
    const cb = s * ((1 - alphaF) * If_eq + (1 - alphaR) * Ir_eq);

    // Stamping into matrix (Note: Jacobian conductances are identical for NPN/PNP)
    const [c, b, e] = this.nodes;

    // Collector Row (c)
    stamper.stampMatrix(c, c, gbc);
    stamper.stampMatrix(c, b, alphaF * gbe - gbc);
    stamper.stampMatrix(c, e, -alphaF * gbe);
    stamper.stampRightSide(c, -cc);

    // Base Row (b)
    stamper.stampMatrix(b, c, -(1 - alphaR) * gbc);
    stamper.stampMatrix(b, b, (1 - alphaF) * gbe + (1 - alphaR) * gbc);
    stamper.stampMatrix(b, e, -(1 - alphaF) * gbe);
    stamper.stampRightSide(b, -cb);

    // Emitter Row (e)
    stamper.stampMatrix(e, c, -alphaR * gbc);
    stamper.stampMatrix(e, b, -gbe - alphaR * gbc);
    stamper.stampMatrix(e, e, gbe);
    stamper.stampRightSide(e, cc + cb);
  }

  calculateCurrent(): void {
    const vC = this.volts[0];
    const vB = this.volts[1];
    const vE = this.volts[2];

    const s = this.isNpn ? 1 : -1;
    const vbe = s * (vB - vE);
    const vbc = s * (vB - vC);

    const alphaF = this.bf / (1 + this.bf);
    const alphaR = this.br / (1 + this.br);

    let vbe_vt = vbe / this.vt;
    let vbc_vt = vbc / this.vt;
    const maxExp = 150;
    const minExp = -1500 / this.vt;
    if (vbe_vt > maxExp) vbe_vt = maxExp;
    if (vbe_vt < minExp) vbe_vt = minExp;
    if (vbc_vt > maxExp) vbc_vt = maxExp;
    if (vbc_vt < minExp) vbc_vt = minExp;

    const If = (this.is / alphaF) * (Math.exp(vbe_vt) - 1);
    const Ir = (this.is / alphaR) * (Math.exp(vbc_vt) - 1);

    // Current is designated as Collector-Emitter current
    this.current = s * (alphaF * If - Ir);
  }

  getCurrentIntoNode(n: number): number {
    const vC = this.volts[0];
    const vB = this.volts[1];
    const vE = this.volts[2];

    const s = this.isNpn ? 1 : -1;
    const vbe = s * (vB - vE);
    const vbc = s * (vB - vC);

    const alphaF = this.bf / (1 + this.bf);
    const alphaR = this.br / (1 + this.br);

    let vbe_vt = vbe / this.vt;
    let vbc_vt = vbc / this.vt;
    const maxExp = 150;
    const minExp = -1500 / this.vt;
    if (vbe_vt > maxExp) vbe_vt = maxExp;
    if (vbe_vt < minExp) vbe_vt = minExp;
    if (vbc_vt > maxExp) vbc_vt = maxExp;
    if (vbc_vt < minExp) vbc_vt = minExp;

    const If = (this.is / alphaF) * (Math.exp(vbe_vt) - 1);
    const Ir = (this.is / alphaR) * (Math.exp(vbc_vt) - 1);

    if (n === 0) return s * (alphaF * If - Ir); // Collector (inwards)
    if (n === 1) return s * ((1 - alphaF) * If + (1 - alphaR) * Ir); // Base (inwards)
    return s * (-If + alphaR * Ir); // Emitter (inwards)
  }

  getInfo(): Record<string, string> {
    const vC = this.volts[0];
    const vB = this.volts[1];
    const vE = this.volts[2];

    const ib = this.getCurrentIntoNode(1);
    const ie = this.getCurrentIntoNode(2);

    return {
      name: this.isNpn ? 'NPN Transistor (BJT)' : 'PNP Transistor (BJT)',
      beta: `${this.bf}`,
      'Vbe': `${(vB - vE).toFixed(4)} V`,
      'Vbc': `${(vB - vC).toFixed(4)} V`,
      'Vce': `${(vC - vE).toFixed(4)} V`,
      'Ic': `${this.current.toExponential(3)} A`,
      'Ib': `${ib.toExponential(3)} A`,
      'Ie': `${ie.toExponential(3)} A`,
    };
  }

  reset(): void {
    super.reset();
    this.lastVbe = 0;
    this.lastVbc = 0;
  }
}
