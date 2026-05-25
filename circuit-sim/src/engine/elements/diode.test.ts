import { describe, it, expect, vi } from 'vitest';
import { DiodeElement } from './diode';
import type { IStamper } from '../types';

describe('DiodeElement (PWL Model)', () => {
  it('detects state change from OFF to ON and sets converged to false', () => {
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

    // State changes from OFF (0V) to ON (1.0V)
    diode.lastvoltdiff = 0.0;
    diode.setNodeVoltage(0, 1.0);
    diode.setNodeVoltage(1, 0.0);

    diode.doStep(stamper);

    // State changed, so convergence should be false
    expect(stamper.converged).toBe(false);
    expect(diode.vdio).toBe(0.7); // forward voltage threshold
  });

  it('converges successfully when state remains unchanged', () => {
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

    // State was ON (0.8V) and remains ON (0.85V)
    diode.lastvoltdiff = 0.8;
    diode.setNodeVoltage(0, 0.85);
    diode.setNodeVoltage(1, 0);

    diode.doStep(stamper);

    // State did not change, so it should remain converged
    expect(stamper.converged).toBe(true);
    expect(diode.vdio).toBe(0.7);
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
