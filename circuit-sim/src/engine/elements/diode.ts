import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class DiodeElement extends CircuitElement {
  type = 'diode';
  
  // PWL diode model parameters
  forwardVoltage = 0.7;
  zenerVoltage = 0.0;
  rs = 0.1;        // Parasitic series resistance (ohms)
  
  // Compatibility fields
  leakage = 1e-14;
  vt = 0.02585;
  vdio = 0;        
  lastvoltdiff = 0;
  lastGeq = 0;     
  lastIeq = 0;     

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

  doStep(stamper: IStamper): void {
    const voltdiff = this.volts[0] - this.volts[1];

    // Determine the state based on the terminal voltage
    let state: 'ON' | 'OFF' | 'ZENER' = 'OFF';
    if (voltdiff >= this.forwardVoltage) {
      state = 'ON';
    } else if (this.zenerVoltage > 0 && voltdiff <= -this.zenerVoltage) {
      state = 'ZENER';
    }

    // Convergence check: did the state change from the last subiteration?
    const lastState = this.lastvoltdiff >= this.forwardVoltage
      ? 'ON'
      : (this.zenerVoltage > 0 && this.lastvoltdiff <= -this.zenerVoltage ? 'ZENER' : 'OFF');

    if (state !== lastState) {
      stamper.converged = false;
    }

    this.lastvoltdiff = voltdiff;
    this.vdio = voltdiff >= this.forwardVoltage ? this.forwardVoltage : (this.zenerVoltage > 0 && voltdiff <= -this.zenerVoltage ? -this.zenerVoltage : voltdiff);

    const safeRs = isFinite(this.rs) && this.rs > 0 ? this.rs : 0.1;
    const G_on = 1 / safeRs;

    let geq = 1e-9; // 1 GOhms off resistance
    let ieq = 0;

    if (state === 'ON') {
      geq = G_on;
      ieq = -this.forwardVoltage * G_on;
    } else if (state === 'ZENER') {
      geq = G_on;
      ieq = this.zenerVoltage * G_on;
    }

    this.lastGeq = geq;
    this.lastIeq = ieq;

    stamper.stampConductance(this.nodes[0], this.nodes[1], geq);
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], ieq);
  }

  calculateCurrent(): void {
    const voltdiff = this.volts[0] - this.volts[1];
    
    let state: 'ON' | 'OFF' | 'ZENER' = 'OFF';
    if (voltdiff >= this.forwardVoltage) {
      state = 'ON';
    } else if (this.zenerVoltage > 0 && voltdiff <= -this.zenerVoltage) {
      state = 'ZENER';
    }

    const safeRs = isFinite(this.rs) && this.rs > 0 ? this.rs : 0.1;
    const G_on = 1 / safeRs;

    if (state === 'ON') {
      this.current = G_on * (voltdiff - this.forwardVoltage);
    } else if (state === 'ZENER') {
      this.current = G_on * (voltdiff + this.zenerVoltage);
    } else {
      this.current = 1e-9 * voltdiff;
    }
  }
}
