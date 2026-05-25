// ============================================================
// AC/DC & Advanced Waveform Voltage Source Element
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class VoltageSourceElement extends CircuitElement {
  type = 'voltage';
  maxVoltage: number;
  waveform: 'DC' | 'AC' | 'SQUARE' | 'TRIANGLE' | 'PULSE' | 'PWL' = 'DC';
  frequency: number = 40; // Hz
  dutyCycle: number = 0.5; // duty cycle for SQUARE/PULSE (0 to 1)
  bias: number = 0; // DC offset / bias voltage
  pwlPoints: { t: number; v: number }[] = []; // piecewise linear points

  constructor(x: number, y: number, x2: number, y2: number, voltage = 5) {
    super(x, y, x2, y2);
    this.maxVoltage = voltage;
  }

  getVoltageSourceCount(): number { return 1; }

  nonLinear(): boolean { return false; }

  getVoltage(t: number): number {
    const safeFrequency = (Number.isFinite(this.frequency) && this.frequency > 0) ? this.frequency : 1;
    switch (this.waveform) {
      case 'DC':
        return this.maxVoltage;
      case 'AC':
        return this.bias + Math.sin(2 * Math.PI * safeFrequency * t) * this.maxVoltage;
      case 'SQUARE': {
        const T = 1 / safeFrequency;
        const tMod = t % T;
        const cutoff = T * this.dutyCycle;
        return tMod < cutoff ? (this.bias + this.maxVoltage) : (this.bias - this.maxVoltage);
      }
      case 'PULSE': {
        const T = 1 / safeFrequency;
        const tMod = t % T;
        const cutoff = T * this.dutyCycle;
        return tMod < cutoff ? (this.bias + this.maxVoltage) : this.bias;
      }
      case 'TRIANGLE': {
        const T = 1 / safeFrequency;
        const tMod = (t % T) / T;
        if (tMod < 0.5) {
          return this.bias - this.maxVoltage + 4 * this.maxVoltage * tMod;
        } else {
          return this.bias + 3 * this.maxVoltage - 4 * this.maxVoltage * tMod;
        }
      }
      case 'PWL': {
        if (this.pwlPoints.length === 0) return this.bias;
        if (t <= this.pwlPoints[0].t) return this.pwlPoints[0].v;
        if (t >= this.pwlPoints[this.pwlPoints.length - 1].t) {
          return this.pwlPoints[this.pwlPoints.length - 1].v;
        }
        for (let i = 0; i < this.pwlPoints.length - 1; i++) {
          const pt0 = this.pwlPoints[i];
          const pt1 = this.pwlPoints[i + 1];
          if (t >= pt0.t && t <= pt1.t) {
            if (pt1.t === pt0.t) return pt0.v;
            return pt0.v + (pt1.v - pt0.v) * (t - pt0.t) / (pt1.t - pt0.t);
          }
        }
        return this.bias;
      }
      default:
        return this.maxVoltage;
    }
  }

  registerNextBreakpoints(stamper: IStamper): void {
    const safeFrequency = (Number.isFinite(this.frequency) && this.frequency > 0) ? this.frequency : 1;
    switch (this.waveform) {
      case 'SQUARE':
      case 'PULSE': {
        const T = 1 / safeFrequency;
        const k = Math.floor(stamper.t / T);
        const t1 = k * T + T * this.dutyCycle;
        const t2 = (k + 1) * T;
        const t3 = (k + 1) * T + T * this.dutyCycle;
        
        if (t1 > stamper.t) stamper.registerBreakpoint?.(t1);
        if (t2 > stamper.t) stamper.registerBreakpoint?.(t2);
        if (t3 > stamper.t) stamper.registerBreakpoint?.(t3);
        break;
      }
      case 'TRIANGLE': {
        const T = 1 / safeFrequency;
        const halfT = T / 2;
        const k = Math.floor(stamper.t / halfT);
        const t1 = (k + 1) * halfT;
        const t2 = (k + 2) * halfT;
        
        if (t1 > stamper.t) stamper.registerBreakpoint?.(t1);
        if (t2 > stamper.t) stamper.registerBreakpoint?.(t2);
        break;
      }
      case 'PWL': {
        for (const pt of this.pwlPoints) {
          if (pt.t > stamper.t) {
            stamper.registerBreakpoint?.(pt.t);
          }
        }
        break;
      }
    }
  }

  stamp(stamper: IStamper): void {
    if (stamper.isACSweep) {
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
      return;
    }
    if (stamper.isDCOperatingPoint) {
      let baseV = this.waveform === 'DC' ? this.maxVoltage : this.bias;
      if (this.waveform === 'PWL') {
        baseV = this.getVoltage(0);
      }
      const scale = stamper.homotopyScale ?? 1.0;
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, baseV * scale);
      return;
    }
    if (this.waveform === 'DC') {
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.maxVoltage);
    } else {
      stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
      this.registerNextBreakpoints(stamper);
    }
  }

  doStep(stamper: IStamper): void {
    if (stamper.isDCOperatingPoint) {
      let baseV = this.waveform === 'DC' ? this.maxVoltage : this.bias;
      if (this.waveform === 'PWL') {
        baseV = this.getVoltage(0);
      }
      const scale = stamper.homotopyScale ?? 1.0;
      stamper.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, baseV * scale);
      return;
    }
    if (stamper.isACSweep) {
      return;
    }
    if (this.waveform !== 'DC') {
      this.registerNextBreakpoints(stamper);
      stamper.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage(stamper.t));
    }
  }

  calculateCurrent(): void { /* current set by solver */ }

  getVoltageDiff(): number { return this.volts[1] - this.volts[0]; }

  getPower(): number { return -this.getVoltageDiff() * this.current; }

  getInfo(): Record<string, string> {
    let nameStr = 'Voltage Source';
    switch (this.waveform) {
      case 'DC': nameStr = 'DC Voltage Source'; break;
      case 'AC': nameStr = 'AC Voltage Source'; break;
      case 'SQUARE': nameStr = 'Square Wave Source'; break;
      case 'TRIANGLE': nameStr = 'Triangle Wave Source'; break;
      case 'PULSE': nameStr = 'Pulse Source'; break;
      case 'PWL': nameStr = 'PWL Source'; break;
    }
    const info: Record<string, string> = {
      name: nameStr,
      voltage: `${this.maxVoltage} V`,
      current: `${this.current.toExponential(3)} A`,
      power: `${this.getPower().toExponential(3)} W`,
    };
    if (this.waveform !== 'DC' && this.waveform !== 'PWL') {
      info.frequency = `${this.frequency} Hz`;
    }
    if (this.waveform === 'SQUARE' || this.waveform === 'PULSE') {
      info.dutyCycle = `${(this.dutyCycle * 100).toFixed(1)}%`;
    }
    if (this.waveform === 'AC' || this.waveform === 'SQUARE' || this.waveform === 'TRIANGLE' || this.waveform === 'PULSE') {
      info.bias = `${this.bias} V`;
    }
    return info;
  }
}
