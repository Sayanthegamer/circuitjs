import { describe, it, expect, vi } from 'vitest';
import { VoltageSourceElement } from './voltage-source';
import type { IStamper } from '../types';

describe('VoltageSourceElement', () => {
  const createMockStamper = (): IStamper => ({
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
  });

  it('initializes with correct default values', () => {
    const vs = new VoltageSourceElement(0, 0, 1, 1);
    expect(vs.maxVoltage).toBe(5);
    expect(vs.type).toBe('voltage');
    expect(vs.getVoltageSourceCount()).toBe(1);
  });

  it('initializes with provided voltage', () => {
    const vs = new VoltageSourceElement(0, 0, 1, 1, 12);
    expect(vs.maxVoltage).toBe(12);
  });

  it('stamps voltage source correctly', () => {
    const vs = new VoltageSourceElement(0, 0, 1, 1, 9);
    vs.setNode(0, 1);
    vs.setNode(1, 2);
    vs.setVoltageSource(0, 3); // Assign voltage source index 3

    const stamper = createMockStamper();
    vs.stamp(stamper);

    expect(stamper.stampVoltageSource).toHaveBeenCalledWith(1, 2, 3, 9);
  });

  it('calculates power correctly', () => {
    const vs = new VoltageSourceElement(0, 0, 1, 1, 5);

    // Set node voltages: node0 = 5V, node1 = 0V
    vs.setNodeVoltage(0, 5);
    vs.setNodeVoltage(1, 0);

    // Current is set by the matrix solver, simulate this
    // If current is 2A flowing from node 0 to 1, then internal current = 2
    vs.setCurrent(0, 2);

    // diff = volts[1] - volts[0] = 0 - 5 = -5
    // power = -diff * current = -(-5) * 2 = 10
    expect(vs.getVoltageDiff()).toBe(-5);
    expect(vs.getPower()).toBe(10);
  });

  it('returns correct info', () => {
    const vs = new VoltageSourceElement(0, 0, 1, 1, 5);
    vs.setNodeVoltage(0, 5);
    vs.setNodeVoltage(1, 0);
    vs.setCurrent(0, 0.002);

    const info = vs.getInfo();
    expect(info.name).toBe('DC Voltage Source');
    expect(info.voltage).toBe('5 V');
    expect(info.current).toBe('2.000e-3 A');
    // power = -(-5) * 0.002 = 0.010 W
    expect(info.power).toBe('1.000e-2 W');
  });
});
