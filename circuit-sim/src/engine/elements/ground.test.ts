import { describe, it, expect, vi } from 'vitest';
import { GroundElement } from './ground';
import type { IStamper } from '../types';

describe('GroundElement', () => {
  it('initializes with correct properties', () => {
    const ground = new GroundElement(10, 20);
    expect(ground.type).toBe('ground');
    // Ground element constructor passes (x, y, x, y) to base class
    expect(ground.x).toBe(10);
    expect(ground.y).toBe(20);
    expect(ground.x2).toBe(10);
    expect(ground.y2).toBe(20);
  });

  it('has exactly one post and zero voltage sources', () => {
    const ground = new GroundElement(0, 0);
    expect(ground.getPostCount()).toBe(1);
    expect(ground.getVoltageSourceCount()).toBe(0);
  });

  it('reports correct connection states', () => {
    const ground = new GroundElement(0, 0);
    // Ground always reports true for hasGroundConnection
    expect(ground.hasGroundConnection(0)).toBe(true);
    expect(ground.hasGroundConnection(1)).toBe(true);

    // Ground always reports true for getConnection between any nodes
    expect(ground.getConnection(0, 1)).toBe(true);
    expect(ground.getConnection(1, 2)).toBe(true);
  });

  it('does not perform operations during stamp', () => {
    const ground = new GroundElement(0, 0);
    const stamper: IStamper = {
      timeStep: 0.001,
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

    ground.stamp(stamper);

    // Verify no methods were called on the stamper
    expect(stamper.stampMatrix).not.toHaveBeenCalled();
    expect(stamper.stampRightSide).not.toHaveBeenCalled();
    expect(stamper.stampResistor).not.toHaveBeenCalled();
    expect(stamper.stampConductance).not.toHaveBeenCalled();
    expect(stamper.stampVoltageSource).not.toHaveBeenCalled();
    expect(stamper.stampCurrentSource).not.toHaveBeenCalled();
    expect(stamper.stampNonLinear).not.toHaveBeenCalled();
    expect(stamper.updateVoltageSource).not.toHaveBeenCalled();
  });

  it('handles calculateCurrent as a no-op', () => {
    const ground = new GroundElement(0, 0);
    // calculateCurrent should not throw or change state in unexpected ways
    expect(() => ground.calculateCurrent()).not.toThrow();
  });
});
