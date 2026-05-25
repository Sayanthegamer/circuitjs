import { describe, it, expect, vi } from 'vitest';
import { BJTElement } from './bjt';
import type { IStamper } from '../types';

describe('BJTElement', () => {
  it('initializes correctly with 3 posts and default parameters', () => {
    const bjt = new BJTElement(0, 0, 100, 0, true); // NPN BJT
    expect(bjt.type).toBe('bjt');
    expect(bjt.getPostCount()).toBe(3);
    expect(bjt.isNpn).toBe(true);
    expect(bjt.bf).toBe(100);
    expect(bjt.br).toBe(1);
  });

  it('calculates the collector, base, emitter post coordinates correctly', () => {
    const bjt = new BJTElement(50, 50, 100, 50, true); // Horizontal orientation
    // Post 0: Collector, Post 1: Base, Post 2: Emitter
    const cPos = bjt.getPost(0);
    const bPos = bjt.getPost(1);
    const ePos = bjt.getPost(2);

    expect(bPos).toEqual({ x: 50, y: 50 });
    expect(cPos).toEqual({ x: 100, y: 18 }); // 50 - 32
    expect(ePos).toEqual({ x: 100, y: 82 }); // 50 + 32
  });

  it('stamps non-linear flags across all three nodes', () => {
    const bjt = new BJTElement(0, 0, 100, 0, true);
    bjt.setNode(0, 5); // Collector node 5
    bjt.setNode(1, 6); // Base node 6
    bjt.setNode(2, 7); // Emitter node 7

    const stamper: IStamper = {
      timeStep: 1e-5,
      t: 0,
      stampResistor: vi.fn(),
      stampRightSide: vi.fn(),
      stampCurrentSource: vi.fn(),
      stampConductance: vi.fn(),
      stampNonLinear: vi.fn(),
      stampMatrix: vi.fn(),
      stampVoltageSource: vi.fn(),
      updateVoltageSource: vi.fn(),
      nodeCount: 0,
      converged: true,
      subIterations: 0
    };

    bjt.stamp(stamper);

    expect(stamper.stampNonLinear).toHaveBeenCalledWith(5);
    expect(stamper.stampNonLinear).toHaveBeenCalledWith(6);
    expect(stamper.stampNonLinear).toHaveBeenCalledWith(7);
  });

  it('limits exponential step size and triggers false convergence on large voltage steps', () => {
    const bjt = new BJTElement(0, 0, 100, 0, true);
    bjt.setNode(0, 1);
    bjt.setNode(1, 2);
    bjt.setNode(2, 3);

    const stamper: IStamper = {
      timeStep: 1e-5,
      t: 0,
      stampResistor: vi.fn(),
      stampRightSide: vi.fn(),
      stampCurrentSource: vi.fn(),
      stampConductance: vi.fn(),
      stampNonLinear: vi.fn(),
      stampMatrix: vi.fn(),
      stampVoltageSource: vi.fn(),
      updateVoltageSource: vi.fn(),
      nodeCount: 0,
      converged: true,
      subIterations: 0
    };

    // Simulate forward active bias: Vb = 1V, Ve = 0V, Vc = 5V
    // Raw Vbe = 1V (huge step from lastVbe = 0)
    bjt.lastVbe = 0;
    bjt.lastVbc = 0;
    bjt.setNodeVoltage(0, 5.0);
    bjt.setNodeVoltage(1, 1.0);
    bjt.setNodeVoltage(2, 0.0);

    bjt.doStep(stamper);

    // Should indicate non-convergence
    expect(stamper.converged).toBe(false);
    expect(bjt.lastVbe).toBeLessThan(1.0); // Limited!
    expect(bjt.lastVbe).toBeGreaterThan(0.2);
  });

  it('converges successfully when voltage changes are small', () => {
    const bjt = new BJTElement(0, 0, 100, 0, true);
    bjt.setNode(0, 1);
    bjt.setNode(1, 2);
    bjt.setNode(2, 3);

    const stamper: IStamper = {
      timeStep: 1e-5,
      t: 0,
      stampResistor: vi.fn(),
      stampRightSide: vi.fn(),
      stampCurrentSource: vi.fn(),
      stampConductance: vi.fn(),
      stampNonLinear: vi.fn(),
      stampMatrix: vi.fn(),
      stampVoltageSource: vi.fn(),
      updateVoltageSource: vi.fn(),
      nodeCount: 0,
      converged: true,
      subIterations: 0
    };

    // Vbe changed slightly from 0.7V to 0.70005V
    bjt.lastVbe = 0.7;
    bjt.lastVbc = -4.3;
    bjt.setNodeVoltage(0, 5.0);
    bjt.setNodeVoltage(1, 0.70005);
    bjt.setNodeVoltage(2, 0.0);

    bjt.doStep(stamper);

    expect(stamper.converged).toBe(true);
    expect(bjt.lastVbe).toBeCloseTo(0.70005, 5);
  });

  it('calculates amplification current correctly (Ic = Beta * Ib)', () => {
    const bjt = new BJTElement(0, 0, 100, 0, true);
    bjt.bf = 100;
    
    // Set typical forward active bias voltages: Vbe = 0.7V, Vbc = -4.3V (Vb=0.7, Ve=0, Vc=5)
    bjt.setNodeVoltage(0, 5.0);
    bjt.setNodeVoltage(1, 0.7);
    bjt.setNodeVoltage(2, 0.0);

    bjt.calculateCurrent();

    const ic = bjt.getCurrentIntoNode(0);
    const ib = bjt.getCurrentIntoNode(1);

    expect(ic).toBeGreaterThan(0);
    expect(ib).toBeGreaterThan(0);
    expect(ic / ib).toBeCloseTo(100, 1); // Ic / Ib ≈ Beta
  });
});
