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
    const vcrit = this.vt * Math.log(this.vt / (Math.SQRT2 * this.leakage));

    // If the voltage step is small or hasn't crossed the critical threshold, do not limit
    if (vnew <= vcrit || Math.abs(vnew - vold) <= (this.vt + this.vt)) {
      return vnew;
    }

    if (vold > 0) {
      const arg = 1 + (vnew - vold) / this.vt;
      if (arg > 0) {
        // Standard SPICE pnjlim logarithmic step compression
        return vold + this.vt * Math.log(arg);
      }
      return vcrit;
    } 
    
    // FIX: Instead of crushing the step down to near-zero, step safely to the critical turn-on point
    return vcrit;
  }

  doStep(stamper: IStamper): void {
    let voltdiff = this.volts[0] - this.volts[1];

    if (isNaN(voltdiff) || !isFinite(voltdiff)) {
      voltdiff = this.lastvoltdiff;
    }

    if (Math.abs(voltdiff - this.lastvoltdiff) > 0.001) {
      stamper.converged = false;
    }

    let vnext = this.limitStep(voltdiff, this.lastvoltdiff);

    const maxVf = 150 * this.vt;
    if (vnext > maxVf) vnext = maxVf;
    if (vnext < -15) vnext = -15;

    this.vdio = vnext;
    this.lastvoltdiff = vnext;

    const expTerm = Math.exp(this.vdio / this.vt);
    let geq = (this.leakage / this.vt) * expTerm;

    let gmin = this.leakage * 0.01;

    if (stamper.subIterations > 100) {
        gmin = Math.exp(-9 * Math.log(10) * (1 - stamper.subIterations / 3000.));
        if (gmin > .1) gmin = .1;
    }
    geq += gmin;

    if (geq < 1e-12) geq = 1e-12;

    let current = this.leakage * (expTerm - 1);

    // FIX: Linearize the model once we hit the conductance ceiling
    // This prevents the equivalent current source (ieq) from diverging.
    const maxGeq = 1e4;
    if (geq > maxGeq) {
        geq = maxGeq;
        
        // Calculate the exact voltage where geq naturally hit the 1e4 ceiling
        const expBound = (maxGeq * this.vt) / this.leakage;
        const vBound = this.vt * Math.log(expBound);
        const iBound = this.leakage * (expBound - 1);
        
        // Extend the curve linearly past this point
        current = iBound + maxGeq * (this.vdio - vBound);
    }

    const ieq = current - geq * this.vdio;

    stamper.stampConductance(this.nodes[0], this.nodes[1], geq);
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], ieq);
  }

  calculateCurrent(): void {
    const voltdiff = this.volts[0] - this.volts[1];
    let vclamp = voltdiff;
    
    const maxVf = 150 * this.vt;
    if (vclamp > maxVf) vclamp = maxVf;
    if (vclamp < -15) vclamp = -15;
    
    const expTerm = Math.exp(vclamp / this.vt);
    let geq = (this.leakage / this.vt) * expTerm;
    const maxGeq = 1e4;
    
    // Maintain identical linearization for telemetry/UI plotting
    if (geq > maxGeq) {
        const expBound = (maxGeq * this.vt) / this.leakage;
        const vBound = this.vt * Math.log(expBound);
        const iBound = this.leakage * (expBound - 1);
        this.current = iBound + maxGeq * (vclamp - vBound);
    } else {
        this.current = this.leakage * (expTerm - 1);
    }
  }
}
