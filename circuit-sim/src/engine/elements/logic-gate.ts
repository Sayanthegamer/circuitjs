// ============================================================
// Mixed-Signal Event-Driven Logic Gates (AND, OR, NOT)
// ============================================================

import { CircuitElement } from './base';
import type { IStamper } from '../types';

export class LogicGateElement extends CircuitElement {
  type = 'logic_gate';
  gateType: 'AND' | 'OR' | 'NOT';
  vHigh = 5.0; // Logical High Voltage
  vLow = 0.0;  // Logical Low Voltage
  vThreshold = 2.5; // Input Logic Threshold Voltage
  propagationDelay = 1e-6; // 1us default propagation delay

  // State tracking
  lastIn1 = false;
  lastIn2 = false;
  lastOutVal = 0.0;
  nextTransitionTime = -1;
  targetOutVal = 0.0;

  constructor(x: number, y: number, x2: number, y2: number, gateType: 'AND' | 'OR' | 'NOT' = 'AND') {
    super(x, y, x2, y2);
    this.gateType = gateType;
    this.lastOutVal = this.gateType === 'NOT' ? this.vHigh : this.vLow;
    this.targetOutVal = this.lastOutVal;
  }

  getPostCount(): number {
    return this.gateType === 'NOT' ? 2 : 3;
  }

  getVoltageSourceCount(): number {
    return 1;
  }

  nonLinear(): boolean {
    return false;
  }

  getPost(n: number): { x: number; y: number } {
    if (this.gateType === 'NOT') {
      return n === 0 ? { x: this.x, y: this.y } : { x: this.x2, y: this.y2 };
    }

    // Symmetrical positioning for 3-terminal AND/OR gates
    const horizontal = Math.abs(this.x2 - this.x) > Math.abs(this.y2 - this.y);
    if (horizontal) {
      if (n === 0) return { x: this.x, y: this.y - 10 }; // Input 1
      if (n === 1) return { x: this.x, y: this.y + 10 }; // Input 2
      return { x: this.x2, y: this.y2 };                  // Output
    } else {
      if (n === 0) return { x: this.x - 10, y: this.y }; // Input 1
      if (n === 1) return { x: this.x + 10, y: this.y }; // Input 2
      return { x: this.x2, y: this.y2 };                  // Output
    }
  }

  stamp(stamper: IStamper): void {
    const outputPin = this.gateType === 'NOT' ? 1 : 2;
    stamper.stampVoltageSource(this.nodes[outputPin], 0, this.voltSource);
  }

  doStep(stamper: IStamper): void {
    const outputPin = this.gateType === 'NOT' ? 1 : 2;
    const in1 = this.volts[0] >= this.vThreshold;
    const in2 = this.gateType !== 'NOT' ? (this.volts[1] >= this.vThreshold) : false;

    // Execution Bypass Optimization:
    // If inputs haven't crossed the threshold and no transition is pending, bypass solver update
    if (in1 === this.lastIn1 && in2 === this.lastIn2 && this.nextTransitionTime === -1) {
      stamper.updateVoltageSource(this.nodes[outputPin], 0, this.voltSource, this.lastOutVal);
      return;
    }

    // Evaluate logical behavior
    let expectedOut = false;
    if (this.gateType === 'NOT') {
      expectedOut = !in1;
    } else if (this.gateType === 'AND') {
      expectedOut = in1 && in2;
    } else if (this.gateType === 'OR') {
      expectedOut = in1 || in2;
    }

    const targetV = expectedOut ? this.vHigh : this.vLow;

    // If expected output changed, schedule transition breakpoint
    if (targetV !== this.targetOutVal) {
      this.targetOutVal = targetV;
      this.nextTransitionTime = stamper.t + this.propagationDelay;
      stamper.registerBreakpoint?.(this.nextTransitionTime);
    }

    // Apply state change when delay has elapsed
    if (this.nextTransitionTime !== -1 && (stamper.t + stamper.timeStep) >= this.nextTransitionTime - 1e-12) {
      this.lastOutVal = this.targetOutVal;
      this.nextTransitionTime = -1;
      this.lastIn1 = in1;
      this.lastIn2 = in2;
    }

    stamper.updateVoltageSource(this.nodes[outputPin], 0, this.voltSource, this.lastOutVal);
  }

  calculateCurrent(): void {
    // Current is solved by matrix solver and set via setCurrent()
  }

  getCurrentIntoNode(n: number): number {
    const outputPin = this.gateType === 'NOT' ? 1 : 2;
    if (n === outputPin) return this.current;
    return 0; // high-impedance inputs
  }

  getInfo(): Record<string, string> {
    const in1 = this.volts[0] >= this.vThreshold ? '1' : '0';
    const in2 = this.gateType !== 'NOT' ? (this.volts[1] >= this.vThreshold ? '1' : '0') : '';
    const out = this.lastOutVal === this.vHigh ? '1' : '0';
    
    const info: Record<string, string> = {
      name: `${this.gateType} Gate`,
      inputs: this.gateType === 'NOT' ? `In = ${in1}` : `In = (${in1}, ${in2})`,
      output: `Out = ${out} (${this.lastOutVal.toFixed(2)} V)`,
      current: `${this.current.toExponential(3)} A`,
    };
    return info;
  }

  reset(): void {
    super.reset();
    this.lastIn1 = false;
    this.lastIn2 = false;
    this.lastOutVal = this.gateType === 'NOT' ? this.vHigh : this.vLow;
    this.nextTransitionTime = -1;
    this.targetOutVal = this.lastOutVal;
  }
}
