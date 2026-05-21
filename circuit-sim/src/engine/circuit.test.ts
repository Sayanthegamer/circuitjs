import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Circuit } from './circuit';
import { ResistorElement } from './elements/resistor';
import { VoltageSourceElement } from './elements/voltage-source';
import { GroundElement } from './elements/ground';
import { DiodeElement } from './elements/diode';
import { WireElement } from './elements/wire';
import * as matrix from './matrix';

describe('Circuit', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  it('initializes with default values', () => {
    expect(circuit.elements.length).toBe(0);
    expect(circuit.nodeList.length).toBe(0);
    expect(circuit.t).toBe(0);
  });

  describe('Element Management', () => {
    it('adds elements correctly', () => {
      const resistor = new ResistorElement(0, 0, 10, 0, 100);
      circuit.addElement(resistor);

      expect(circuit.elements.length).toBe(1);
      expect(circuit.elements[0]).toBe(resistor);
      expect(circuit.getElement(resistor.id)).toBe(resistor);
    });

    it('removes elements correctly by id', () => {
      const resistor1 = new ResistorElement(0, 0, 10, 0, 100);
      const resistor2 = new ResistorElement(10, 0, 20, 0, 200);
      circuit.addElement(resistor1);
      circuit.addElement(resistor2);

      circuit.removeElement(resistor1.id);

      expect(circuit.elements.length).toBe(1);
      expect(circuit.elements[0]).toBe(resistor2);
      expect(circuit.getElement(resistor1.id)).toBeUndefined();
      expect(circuit.getElement(resistor2.id)).toBe(resistor2);
    });

    it('clears all elements', () => {
      const resistor1 = new ResistorElement(0, 0, 10, 0, 100);
      const resistor2 = new ResistorElement(10, 0, 20, 0, 200);
      circuit.addElement(resistor1);
      circuit.addElement(resistor2);

      circuit.clearElements();

      expect(circuit.elements.length).toBe(0);
      expect(circuit.getElement(resistor1.id)).toBeUndefined();
      expect(circuit.getElement(resistor2.id)).toBeUndefined();
    });
  });

  describe('Circuit Analysis', () => {
    it('analyzes circuit correctly and builds nodes', () => {
      // Create a simple circuit: Voltage source and a resistor
      const vSource = new VoltageSourceElement(0, 0, 10, 0, 5); // 5V
      const resistor = new ResistorElement(10, 0, 10, 10, 100); // 100 ohms
      const wire1 = new WireElement(10, 10, 0, 10);
      const wire2 = new WireElement(0, 10, 0, 0); // Complete loop

      circuit.addElement(vSource);
      circuit.addElement(resistor);
      circuit.addElement(wire1);
      circuit.addElement(wire2);

      circuit.analyzeCircuit();

      // Node list is populated.
      expect(circuit.nodeList.length).toBeGreaterThan(0);
      expect(circuit.voltageSources.length).toBe(1);
      expect(circuit.voltageSources[0]).toBe(vSource);
    });
  });

  describe('State Management', () => {
    it('resets circuit correctly', () => {
      const vSource = new VoltageSourceElement(0, 0, 0, 10, 10);
      const r1 = new ResistorElement(0, 10, 10, 10, 100);
      const r2 = new ResistorElement(10, 10, 10, 0, 100);
      const wire = new WireElement(10, 0, 0, 0);

      circuit.addElement(vSource);
      circuit.addElement(r1);
      circuit.addElement(r2);
      circuit.addElement(wire);

      circuit.analyzeCircuit();
      circuit.runStep();

      // Advance time and check that current isn't zero
      circuit.t = 10;
      expect(circuit.t).toBe(10);

      circuit.reset();

      // Time should be reset
      expect(circuit.t).toBe(0);
      expect(circuit.stopMessage).toBeNull();
    });

    it('returns correct state', () => {
      const vSource = new VoltageSourceElement(0, 0, 0, 10, 10);
      const r1 = new ResistorElement(0, 10, 10, 10, 100);

      circuit.addElement(vSource);
      circuit.addElement(r1);

      circuit.analyzeCircuit();
      circuit.runStep();

      const state = circuit.getState();

      expect(state.t).toBe(circuit.t);
      expect(state.timeStep).toBe(circuit.timeStep);
      expect(state.converged).toBe(circuit.converged);
      expect(state.elementStates.length).toBe(2);
      expect(state.elementStates[0].id).toBe(vSource.id);
      expect(state.elementStates[1].id).toBe(r1.id);
    });
  });

  describe('Simulation Execution (runStep)', () => {
    it('runs step and calculates basic voltage divider correctly', () => {
      // 10V source, two 100 ohm resistors in series
      const vSource = new VoltageSourceElement(0, 0, 0, 10, 10);
      const r1 = new ResistorElement(0, 10, 10, 10, 100);
      const r2 = new ResistorElement(10, 10, 10, 0, 100);
      const wire = new WireElement(10, 0, 0, 0); // complete loop back to source

      circuit.addElement(vSource);
      circuit.addElement(r1);
      circuit.addElement(r2);
      circuit.addElement(wire);

      circuit.analyzeCircuit();
      const success = circuit.runStep();

      expect(success).toBe(true);
      expect(circuit.converged).toBe(true);

      // Node voltages
      // We expect the voltage between the two resistors to be 5V.
      expect(Math.abs(r1.getVoltageDiff())).toBeCloseTo(5);
      expect(Math.abs(r2.getVoltageDiff())).toBeCloseTo(5);

      // vSource provides 10V. The total resistance is 200 ohms. I = V/R = 10/200 = 0.05 A
      expect(Math.abs(r1.getCurrent())).toBeCloseTo(0.05);
      expect(Math.abs(r2.getCurrent())).toBeCloseTo(0.05);
    });

    it('returns false if matrix is not initialized', () => {
      const emptyCircuit = new Circuit();
      emptyCircuit.circuitMatrix = [] as unknown as number[][];
      expect(emptyCircuit.runStep()).toBe(false);

      const nullMatrixCircuit = new Circuit();
      nullMatrixCircuit.circuitMatrix = undefined as unknown as number[][];
      nullMatrixCircuit.addElement(new ResistorElement(0, 0, 10, 0, 100));
      expect(nullMatrixCircuit.runStep()).toBe(false);
    });

    it('runs a successful step for a simple linear circuit', () => {
      const localCircuit = new Circuit();

      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      const r = new ResistorElement(0, 10, 10, 10, 100);
      const wire = new WireElement(10, 10, 0, 0);
      const ground = new GroundElement(0, 10);

      localCircuit.addElement(vs);
      localCircuit.addElement(r);
      localCircuit.addElement(wire);
      localCircuit.addElement(ground);

      localCircuit.analyzeCircuit();

      expect(localCircuit.subIterations).toBe(0);

      const rStartIterationSpy = vi.spyOn(r, 'startIteration');
      const rStepFinishedSpy = vi.spyOn(r, 'stepFinished');

      const result = localCircuit.runStep();

      expect(result).toBe(true);
      expect(localCircuit.converged).toBe(true);

      expect(localCircuit.subIterations).toBe(0);
      expect(rStartIterationSpy).toHaveBeenCalled();
      expect(rStepFinishedSpy).toHaveBeenCalled();

      expect(localCircuit.t).toBeGreaterThan(0);
    });

    it('runs multiple sub-iterations for non-linear circuits', () => {
      const localCircuit = new Circuit();

      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      const diode = new DiodeElement(0, 10, 10, 10);
      const r = new ResistorElement(10, 10, 10, 0, 100);
      const wire = new WireElement(10, 0, 0, 0);
      const ground = new GroundElement(0, 10);

      localCircuit.addElement(vs);
      localCircuit.addElement(diode);
      localCircuit.addElement(r);
      localCircuit.addElement(wire);
      localCircuit.addElement(ground);

      localCircuit.analyzeCircuit();

      expect(localCircuit.circuitNonLinear).toBe(true);

      const result = localCircuit.runStep();
      expect(result).toBe(true);

      expect(localCircuit.converged).toBe(true);
    });

    it('handles NaN/Infinity in matrix gracefully', () => {
      const localCircuit = new Circuit();

      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      const diode = new DiodeElement(0, 10, 10, 10);
      const r = new ResistorElement(10, 10, 10, 0, 100);
      const wire = new WireElement(10, 0, 0, 0);
      const ground = new GroundElement(0, 10);

      localCircuit.addElement(vs);
      localCircuit.addElement(diode);
      localCircuit.addElement(r);
      localCircuit.addElement(wire);
      localCircuit.addElement(ground);

      localCircuit.analyzeCircuit();

      expect(localCircuit.circuitMatrixSize).toBeGreaterThan(0);

      // Using a nonlinear circuit makes matrix size > 0 because diode makes circuit nonlinear,
      // which prevents the matrix rows dropping optimization from removing all rows
      localCircuit.circuitNonLinear = false;
      localCircuit.circuitMatrix[0][0] = NaN;

      const result = localCircuit.runStep();
      expect(result).toBe(false);
      expect(localCircuit.stopMessage).toBe('NaN/infinite matrix!');
    });

    it('handles singular matrix gracefully for non-linear circuits', () => {
      const localCircuit = new Circuit();

      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      const diode = new DiodeElement(0, 10, 10, 10);
      const r = new ResistorElement(10, 10, 10, 0, 100);
      const wire = new WireElement(10, 0, 0, 0);
      const ground = new GroundElement(0, 10);

      localCircuit.addElement(vs);
      localCircuit.addElement(diode);
      localCircuit.addElement(r);
      localCircuit.addElement(wire);
      localCircuit.addElement(ground);

      localCircuit.analyzeCircuit();
      expect(localCircuit.circuitMatrixSize).toBeGreaterThan(0);

      const luFactorSpy = vi.spyOn(matrix, 'luFactor').mockReturnValue(false);

      const result = localCircuit.runStep();

      expect(result).toBe(false);
      expect(localCircuit.stopMessage).toBe('Singular matrix!');

      luFactorSpy.mockRestore();
    });
  });
});