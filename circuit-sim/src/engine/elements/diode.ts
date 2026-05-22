import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class DiodeElement extends CircuitElement {
  type = 'diode';
  
  // Shockley diode model parameters
  leakage = 1e-14; // Is
  vt = 0.02585;    // Thermal voltage
  vdio = 0;        // Current guessed voltage across diode
  lastvoltdiff = 0;
  rs = 0.1;        // Parasitic series resistance (ohms)
  lastGeq = 0;     // Last ideal conductance
  lastIeq = 0;     // Last ideal current source

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
    const voltdiff = this.volts[0] - this.volts[1];

    // 1. Back-calculate the internal junction voltage from the external voltage
    // V_junction = (V_total - Rs * Ieq) / (1 + Geq * Rs)
    let v_junction_raw = voltdiff;
    if (this.rs > 0 && this.lastGeq > 0) {
      v_junction_raw = (voltdiff - this.rs * this.lastIeq) / (1 + this.lastGeq * this.rs);
    }

    if (isNaN(v_junction_raw) || !isFinite(v_junction_raw)) {
      v_junction_raw = this.lastvoltdiff;
    }

    // Check convergence based on the internal junction voltage
    if (Math.abs(v_junction_raw - this.lastvoltdiff) > 0.001) {
      stamper.converged = false;
    }

    // 2. Limit the voltage step
    let vnext = this.limitStep(v_junction_raw, this.lastvoltdiff);

    // Hard safety clamps for Newton-Raphson first-step stability
    const maxVf = 150 * this.vt;
    if (vnext > maxVf) vnext = maxVf;
    if (vnext < -15) vnext = -15;

    this.vdio = vnext;
    this.lastvoltdiff = vnext;

    // 3. Calculate ideal Shockley model (Geq_ideal and Ieq_ideal)
    const expTerm = Math.exp(this.vdio / this.vt);
    let geq_ideal = (this.leakage / this.vt) * expTerm;

    let gmin = this.leakage * 0.01;
    if (stamper.subIterations > 100) {
        gmin = Math.exp(-9 * Math.log(10) * (1 - stamper.subIterations / 3000.));
        if (gmin > .1) gmin = .1;
    }
    geq_ideal += gmin;

    if (geq_ideal < 1e-12) geq_ideal = 1e-12;

    const current_ideal = this.leakage * (expTerm - 1);
    const ieq_ideal = current_ideal - geq_ideal * this.vdio;

    // Save ideal state for next iteration's junction reconstruction
    this.lastGeq = geq_ideal;
    this.lastIeq = ieq_ideal;

    // 4. Apply Norton Transformation to account for Rs without adding matrix nodes
    // G'_eq = G_eq / (1 + G_eq * Rs)
    // I'_eq = I_eq / (1 + G_eq * Rs)
    let geq_norton = geq_ideal;
    let ieq_norton = ieq_ideal;

    if (this.rs > 0) {
      const denominator = 1 + geq_ideal * this.rs;
      geq_norton = geq_ideal / denominator;
      ieq_norton = ieq_ideal / denominator;
    }

    // 5. Stamp the final equivalent model to the external nodes
    stamper.stampConductance(this.nodes[0], this.nodes[1], geq_norton);
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], ieq_norton);
  }

  calculateCurrent(): void {
    const voltdiff = this.volts[0] - this.volts[1];
    
    // Back-calculate the converged internal junction voltage
    let v_junction = voltdiff;
    if (this.rs > 0 && this.lastGeq > 0) {
      v_junction = (voltdiff - this.rs * this.lastIeq) / (1 + this.lastGeq * this.rs);
    }

    // Safety clamp (should rarely hit this if converged)
    const maxVf = 150 * this.vt;
    if (v_junction > maxVf) v_junction = maxVf;
    if (v_junction < -15) v_junction = -15;

    // Calculate true current flowing through the component based on the junction voltage
    const expTerm = Math.exp(v_junction / this.vt);
    this.current = this.leakage * (expTerm - 1);
  }
}
