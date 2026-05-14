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
    const maxStep = 0.05;
    const diff = vnew - vold;
    if (diff > maxStep) return vold + maxStep;
    if (diff < -maxStep) return vold - maxStep;
    return vnew;
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
    if (vclamp > 5) vclamp = 5; 
    
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
    if (vclamp > 5) vclamp = 5;
    this.current = this.leakage * (Math.exp(vclamp / this.vt) - 1);
  }
}
