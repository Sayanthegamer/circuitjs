import { describe, it, expect, vi } from 'vitest';
import { DiodeElement } from './diode';
import type { IStamper } from '../types';

describe('DiodeElement', () => {
  it('checks convergence using limited voltage', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

    const stamper: IStamper = {
      timeStep: 0.001,
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

    // Simulate an overshoot that should limit to a stable value
    // vold = 0.8, vnew = 10.
    diode.lastvoltdiff = 0.8;
    diode.setNodeVoltage(0, 10);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);

    // vnew=10 > vold+0.5 -> 1.3 is handled by PNJLIM now, expect different value but still false convergence
    expect(stamper.converged).toBe(false);
    expect(diode.vdio).toBeGreaterThan(0.5);
    expect(diode.vdio).toBeLessThan(2.0);
  });

  it('converges successfully when difference is small', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

    const stamper: IStamper = {
      timeStep: 0.001,
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

    // vold = 0.8, vnew = 0.8005
    diode.lastvoltdiff = 0.8;
    diode.setNodeVoltage(0, 0.8005);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);

    // Should converge
    expect(stamper.converged).toBe(true);
    expect(diode.vdio).toBeGreaterThan(0.7);
    expect(diode.vdio).toBeLessThan(0.9);
  });

  it('handles zero-state correctly', () => {
    const diode = new DiodeElement(0, 0, 1, 1);

    const stamper: IStamper = {
      timeStep: 0.001,
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

    diode.lastvoltdiff = 0;
    diode.setNodeVoltage(0, 0);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);
    diode.calculateCurrent();

    expect(diode.vdio).toBe(0);
    expect(diode.getCurrent()).toBe(0);
  });
});
