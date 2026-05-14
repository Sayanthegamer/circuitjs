import { describe, it, expect, vi } from 'vitest';
import { DiodeElement } from './diode';
import type { IStamper } from '../types';

describe('DiodeElement', () => {
  it('checks convergence using limited voltage', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

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
      converged: true
    };

    // Simulate an overshoot that should limit to a stable value
    // vold = 0.8, vnew = 10.
    diode.lastvoltdiff = 0.8;
    diode.setNodeVoltage(0, 10);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);

    // vdio = diode.limitStep(10, 0.8) -> 0.8 + 0.05 = 0.85
    // abs(0.85 - 0.8) = 0.05 > 0.001 => converged = false
    expect(diode.vdio).toBeCloseTo(0.85);
    expect(stamper.converged).toBe(false);
  });

  it('converges successfully when difference is small', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

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
      converged: true
    };

    // vold = 0.8, vnew = 0.8005
    diode.lastvoltdiff = 0.8;
    diode.setNodeVoltage(0, 0.8005);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);

    // vdio = diode.limitStep(0.8005, 0.8) -> 0.8005
    // abs(0.8005 - 0.8) = 0.0005 < 0.001 => converged remains true
    expect(diode.vdio).toBe(0.8005);
    expect(stamper.converged).toBe(true);
  });

  it('handles zero-state correctly', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

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
      converged: true
    };

    diode.lastvoltdiff = 0;
    diode.setNodeVoltage(0, 0);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);
    diode.calculateCurrent();

    expect(diode.vdio).toBe(0);
    expect(diode.getCurrent()).toBe(0);
  });
});
