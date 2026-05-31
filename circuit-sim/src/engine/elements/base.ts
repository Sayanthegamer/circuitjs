// ============================================================
// Abstract Base Class for all Circuit Elements
// ============================================================

import type { ICircuitElement, IStamper, Point, ElementId } from '../types';

export abstract class CircuitElement implements ICircuitElement {
  id: ElementId;
  x: number;
  y: number;
  x2: number;
  y2: number;
  abstract type: string;

  nodes: number[] = [];
  volts: number[] = [];
  current = 0;

  protected voltSource = -1;

  constructor(x: number, y: number, x2?: number, y2?: number) {
    this.id = `elm_${this.generateSecureId()}`;
    this.x = x;
    this.y = y;
    this.x2 = x2 ?? x;
    this.y2 = y2 ?? y;
    this.allocNodes();
  }

  protected allocNodes(): void {
    const count = this.getPostCount() + this.getInternalNodeCount();
    this.nodes = new Array(count).fill(0);
    this.volts = (new Float64Array(count) as unknown) as number[];
  }

  // --- Geometry ---

  getPost(n: number): Point {
    return n === 0
      ? { x: this.x, y: this.y }
      : { x: this.x2, y: this.y2 };
  }

  // --- Node management ---

  getPostCount(): number { return 2; }
  getInternalNodeCount(): number { return 0; }
  getVoltageSourceCount(): number { return 0; }

  setNode(j: number, nodeIndex: number): void { this.nodes[j] = nodeIndex; }
  getNode(j: number): number { return this.nodes[j]; }

  setNodeVoltage(n: number, v: number): void { this.volts[n] = v; }

  getVoltageSource(): number { return this.voltSource; }
  setVoltageSource(_j: number, vs: number): void { this.voltSource = vs; }

  setCurrent(_vsIndex: number, current: number): void { this.current = current; }

  // --- Simulation ---

  abstract stamp(stamper: IStamper): void;

  doStep(_stamper: IStamper): void { /* default: no-op for linear elements */ }
  startIteration(): void { /* default: no-op */ }
  stepFinished(): void { this.calculateCurrent(); }

  nonLinear(): boolean { return false; }
  isWire(): boolean { return false; }

  calculateCurrent(): void { /* subclasses override */ }
  getCurrent(): number { return this.current; }

  // --- Topology ---

  getConnectionNodeCount(): number { return this.getPostCount(); }
  getConnectionNode(j: number): number { return this.nodes[j]; }

  getConnection(_n1: number, _n2: number): boolean { return true; }
  hasGroundConnection(_n: number): boolean { return false; }

  getCurrentIntoNode(n: number): number {
    if (this.getPostCount() === 2) {
      return n === 0 ? -this.current : this.current;
    }
    return 0;
  }

  // --- State ---

  reset(): void {
    this.volts.fill(0);
    this.current = 0;
  }

  /** Get voltage difference across element (post 0 - post 1) */
  getVoltageDiff(): number {
    if (this.volts.length < 2) return 0;
    return this.volts[0] - this.volts[1];
  }

  /** Get power dissipated */
  getPower(): number {
    if (this.volts.length < 2) return 0;
    return this.getVoltageDiff() * this.current;
  }

  private generateSecureId(): string {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      if (typeof crypto.getRandomValues === 'function') {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
          (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
        );
      }
    }
    throw new Error("Secure random number generation is not supported by this environment.");
  }
}
