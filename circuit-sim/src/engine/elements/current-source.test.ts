import { describe, it, expect, vi } from 'vitest';
import { CurrentSourceElement } from './current-source';
import { ResistorElement } from './resistor';
import { GroundElement } from './ground';
import { Circuit } from '../circuit';
import type { IStamper } from '../types';

describe('CurrentSourceElement', () => {
  it('initializes with correct defaults', () => {
    const cs = new CurrentSourceElement(0, 0, 100, 0, 0.005);
    expect(cs.type).toBe('current_source');
    expect(cs.currentValue).toBe(0.005); // 5mA
    expect(cs.getPostCount()).toBe(2);
  });

  it('stamps node RHS changes in stamp()', () => {
    const cs = new CurrentSourceElement(0, 0, 100, 0, 0.002);
    cs.setNode(0, 1);
    cs.setNode(1, 2);

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

    cs.stamp(stamper);

    expect(stamper.stampRightSide).toHaveBeenCalledWith(1);
    expect(stamper.stampRightSide).toHaveBeenCalledWith(2);
  });

  it('stamps current value in doStep()', () => {
    const cs = new CurrentSourceElement(0, 0, 100, 0, 0.003);
    cs.setNode(0, 1);
    cs.setNode(1, 2);

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

    cs.doStep(stamper);

    expect(stamper.stampCurrentSource).toHaveBeenCalledWith(1, 2, 0.003);
  });

  it('verifies Ohm\'s Law in a circuit loop', () => {
    const circuit = new Circuit();

    // Create a 5mA current source pumping current from Node 0 (ground) into Node 1
    // And a 1k Ohm resistor connected between Node 1 and Node 0 (ground)
    const cs = new CurrentSourceElement(0, 0, 0, 100, 0.005); // Node 0 -> Node 1
    const r = new ResistorElement(0, 100, 0, 0, 1000);        // Node 1 -> Node 0
    const gnd = new GroundElement(0, 0);                      // Node 0 is Ground

    circuit.addElement(cs);
    circuit.addElement(r);
    circuit.addElement(gnd);

    // Run analysis and solve
    circuit.analyzeCircuit();
    
    // Step simulation
    const success = circuit.runStep();
    expect(success).toBe(true);

    // Node 1 voltage must be: V = I * R = 5mA * 1k = 5V
    const node1Voltage = circuit.nodeVoltages[0]; // Node 1 is index 0 in solver list (after ground)
    expect(node1Voltage).toBeCloseTo(5.0, 3);

    // Check currents
    cs.calculateCurrent();
    r.calculateCurrent();
    expect(cs.getCurrent()).toBe(0.005);
    expect(r.getCurrent()).toBeCloseTo(0.005, 3);
  });

  it('does not cause singular matrix when unconnected', () => {
    const circuit = new Circuit();
    const cs = new CurrentSourceElement(0, 0, 100, 0, 0.002);
    circuit.addElement(cs);
    circuit.analyzeCircuit();
    expect(circuit.stopMessage).toBeNull();
  });
});
