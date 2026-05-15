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
    const vcrit = this.vt * Math.log(this.vt / (Math.SQRT2 * this.leakage));

    // check new voltage; has current changed by factor of e^2?
    if (vnew > vcrit && Math.abs(vnew - vold) > (this.vt + this.vt)) {
      if (vold > 0) {
        arg = 1 + (vnew - vold) / this.vt;
        if (arg > 0) {
          // adjust vnew so that the current is the same
          // as in linearized model from previous iteration.
          vn = vold + this.vt * Math.log(arg);
        } else {
          vn = vcrit;
        }
      } else {
        // adjust vnew so that the current is the same
        // as in linearized model from previous iteration.
        vn = this.vt * Math.log(vnew / this.vt);
      }
    }

    // Still keep a basic limit to prevent wild swings (like SPICE PNJLIM basic check)
    // Actually Java CirSim doesn't do this hard clamping, but it's safe to keep a looser one or omit.
    // Let's stick closer to the Java original which just uses the logic above.
    // But since we removed the clamping, let's just return vn.
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
    
    // To prevent a possible singular matrix or other numeric issues, put a tiny conductance
    // in parallel with each P-N junction.
    let gmin = this.leakage * 0.01;

    // Dynamic gmin heuristic for convergence assistance:
    // When Newton-Raphson struggles (>100 iterations), gradually increase parallel conductance
    // to improve matrix conditioning and help the solver converge.
    if (stamper.subIterations > 100) {
        // Exponential growth formula: gmin = exp(-9*ln(10)*(1-subIterations/3000))
        // - Starts at ~1e-9 S when subIterations = 100
        // - The factor -9*ln(10) ≈ -20.7 sets the base scale (starts at 1e-9)
        // - The ratio (1-subIterations/3000) controls growth rate:
        //   * At iter 100: (1-100/3000) ≈ 0.967 → gmin ≈ 1e-9 S
        //   * At iter 500: (1-500/3000) ≈ 0.833 → gmin ≈ 1e-8 S
        //   * At iter 1000: (1-1000/3000) ≈ 0.667 → gmin ≈ 1e-6 S
        //   * At iter 3000: (1-3000/3000) = 0 → gmin ≈ 1 S (before cap)
        // - Upper bound of 0.1 S prevents excessive damping that would distort results
        gmin = Math.exp(-9*Math.log(10)*(1-stamper.subIterations/3000.));
        if (gmin > .1)
            gmin = .1;  // Cap at 0.1 S to preserve circuit behavior
    }
    geq += gmin;

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
