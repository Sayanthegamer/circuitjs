import { describe, it, expect, vi } from 'vitest';
import { CapacitorElement } from './capacitor';
import type { IStamper } from '../types';

describe('CapacitorElement', () => {
  it('stamps current source with correct polarity', () => {
    const cap = new CapacitorElement(0, 0, 1, 1, 1e-6);

    // Fake the initialization
    cap.setNode(0, 1);
    cap.setNode(1, 2);
    cap.setNodeVoltage(0, 5);
    cap.setNodeVoltage(1, 0);

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

    // First, stamp to set compResistance
    cap.stamp(stamper);

    // startIteration to set currentSourceValue
    cap.startIteration();

    // doStep calls stampCurrentSource
    cap.doStep(stamper);

    // After our fix, it should stamp from node[0] to node[1]
    expect(stamper.stampCurrentSource).toHaveBeenCalledWith(1, 2, expect.any(Number));
  });

  it('calculates energy correctly during charging', () => {
    const cap = new CapacitorElement(0, 0, 1, 1, 1e-6);
    cap.setNodeVoltage(0, 5);
    cap.setNodeVoltage(1, 0);
    // Setting positive current flowing from node 0 to 1
    cap.setCurrent(0, 0.001);

     // v[1] - v[0] = 0 - 5 = -5
    const power = cap.getPower();      // -diff * I = -(-5) * 0.001 = 0.005 (positive power)

    expect(power).toBeGreaterThan(0);
  });

  it('handles zero-state correctly', () => {
    const cap = new CapacitorElement(0, 0, 1, 1, 1e-6);
    cap.setNodeVoltage(0, 0);
    cap.setNodeVoltage(1, 0);
    cap.setCurrent(0, 0);

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
    cap.stamp(stamper);
    cap.startIteration();
    cap.doStep(stamper);
    cap.calculateCurrent();

    expect(cap.getCurrent()).toBeCloseTo(0);
    expect(cap.getPower()).toBeCloseTo(0);
  });
});
