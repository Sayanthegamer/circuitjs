import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class DiodeElement extends CircuitElement {
  type = 'diode';
  
  // Shockley diode model parameters
  leakage = 1e-14; // Is
  vt = 0.02585;    // Thermal voltage
  vdio = 0;        // Current guessed voltage across diode
  lastvoltdiff = 0;

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
  }

  nonLinear(): boolean {
    return true;
  }

  stamp(stamper: IStamper): void {
    stamper.stampNonLinear(this.nodes[0]);
    stamper.stampNonLinear(this.nodes[1]);
  }

  limitStep(vnew: number, vold: number): number {
    let arg: number;
    let vn = vnew;

    // PNJLIM-style stepping (like SPICE)
    if (vnew > 0.1 || vold > 0.1) {
        const vcrit = this.vt * Math.log(this.vt / (Math.SQRT2 * this.leakage));

        if (vold > 0 && vnew > 0) {
            arg = 1 + (vnew - vold) / this.vt;
            if (arg > 0) {
                vn = vold + this.vt * Math.log(arg);
            } else {
                vn = vcrit;
            }
        } else if (vnew > vcrit) {
            vn = vcrit;
        }
    }

    // Still keep a basic limit to prevent wild swings
    if (vn > vold + 0.5) return vold + 0.5;
    if (vn < vold - 0.5) return vold - 0.5;
    return vn;
  }

  doStep(stamper: IStamper): void {
    const voltdiff = this.volts[0] - this.volts[1];

    this.vdio = this.limitStep(voltdiff, this.lastvoltdiff);

    if (Math.abs(this.vdio - this.lastvoltdiff) > 0.001) {
      stamper.converged = false;
    }
    this.lastvoltdiff = this.vdio;

    // I = Is * (e^(V/Vt) - 1)
    // Geq = dI/dV = (Is/Vt) * e^(V/Vt)
    
    // To avoid infinity, clamp vdio to reasonable bounds
    let vclamp = this.vdio;
    if (vclamp > 10) vclamp = 10;
    
    const expTerm = Math.exp(vclamp / this.vt);
    let geq = (this.leakage / this.vt) * expTerm;
    
    // Add minimum conductance to avoid singular matrix
    if (geq < 1e-12) geq = 1e-12;

    const current = this.leakage * (expTerm - 1);
    const ieq = current - geq * vclamp;

    stamper.stampConductance(this.nodes[0], this.nodes[1], geq);
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], ieq);
  }

  calculateCurrent(): void {
    const voltdiff = this.volts[0] - this.volts[1];
    let vclamp = voltdiff;
    if (vclamp > 10) vclamp = 10;
    this.current = this.leakage * (Math.exp(vclamp / this.vt) - 1);
  }
}
