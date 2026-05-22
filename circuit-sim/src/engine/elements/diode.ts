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

    // Guard against NaN propagation from a broken matrix state
    if (isNaN(voltdiff) || !isFinite(voltdiff)) {
      voltdiff = this.lastvoltdiff;
    }

    // 1. FIX: Check convergence using the raw target step BEFORE applying limits
    if (Math.abs(voltdiff - this.lastvoltdiff) > 0.001) {
      stamper.converged = false;
    }

    // 2. Calculate the step-limited voltage for this iteration
    let vnext = this.limitStep(voltdiff, this.lastvoltdiff);

    // 3. FIX: Raise maxVf ceiling to 150 * vt (~3.87V) so high forward-voltage LEDs can turn on
    const maxVf = 150 * this.vt;
    if (vnext > maxVf) vnext = maxVf;
    if (vnext < -15) vnext = -15;

    // 4. FIX: Synchronize historical tracking variables with the actual clamped value
    this.vdio = vnext;
    this.lastvoltdiff = vnext;

    const expTerm = Math.exp(this.vdio / this.vt);
    let geq = (this.leakage / this.vt) * expTerm;

    let gmin = this.leakage * 0.01;

    // Dynamic gmin convergence assistance
    if (stamper.subIterations > 100) {
        gmin = Math.exp(-9 * Math.log(10) * (1 - stamper.subIterations / 3000.));
        if (gmin > .1) gmin = .1;
    }
    geq += gmin;

    // Maintain numeric stability boundaries
    if (geq < 1e-12) geq = 1e-12;
    if (geq > 1e4)   geq = 1e4; // Hard cap on maximum conductance to protect LU factorization

    const current = this.leakage * (expTerm - 1);
    const ieq = current - geq * this.vdio;

    stamper.stampConductance(this.nodes[0], this.nodes[1], geq);
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], ieq);
  }

  calculateCurrent(): void {
    const voltdiff = this.volts[0] - this.volts[1];
    let vclamp = voltdiff;
    // FIX: Match the expanded LED ceiling parameter used in doStep
    const maxVf = 150 * this.vt;
    if (vclamp > maxVf) vclamp = maxVf;
    if (vclamp < -15) vclamp = -15;
    this.current = this.leakage * (Math.exp(vclamp / this.vt) - 1);
  }
}
