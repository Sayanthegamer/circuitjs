import { describe, it, expect, vi } from 'vitest';
import { Circuit } from './circuit';
import { ResistorElement } from './elements/resistor';
import { VoltageSourceElement } from './elements/voltage-source';
import { GroundElement } from './elements/ground';
import { DiodeElement } from './elements/diode';
import { WireElement } from './elements/wire';
import * as matrix from './matrix';

describe('Circuit.runStep()', () => {
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
    const circuit = new Circuit();

    const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
    const r = new ResistorElement(0, 10, 10, 10, 100);
    const wire = new WireElement(10, 10, 0, 0);
    const ground = new GroundElement(0, 10);

    circuit.addElement(vs);
    circuit.addElement(r);
    circuit.addElement(wire);
    circuit.addElement(ground);

    circuit.analyzeCircuit();

    expect(circuit.subIterations).toBe(0);

    const rStartIterationSpy = vi.spyOn(r, 'startIteration');
    const rStepFinishedSpy = vi.spyOn(r, 'stepFinished');

    const result = circuit.runStep();

    expect(result).toBe(true);
    expect(circuit.converged).toBe(true);

    expect(circuit.subIterations).toBe(0);
    expect(rStartIterationSpy).toHaveBeenCalled();
    expect(rStepFinishedSpy).toHaveBeenCalled();

    expect(circuit.t).toBeGreaterThan(0);
  });

  it('runs multiple sub-iterations for non-linear circuits', () => {
    const circuit = new Circuit();

    const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
    const diode = new DiodeElement(0, 10, 10, 10);
    const r = new ResistorElement(10, 10, 10, 0, 100);
    const wire = new WireElement(10, 0, 0, 0);
    const ground = new GroundElement(0, 10);

    circuit.addElement(vs);
    circuit.addElement(diode);
    circuit.addElement(r);
    circuit.addElement(wire);
    circuit.addElement(ground);

    circuit.analyzeCircuit();

    expect(circuit.circuitNonLinear).toBe(true);

    const result = circuit.runStep();
    expect(result).toBe(true);

    expect(circuit.converged).toBe(true);
  });

  it('handles NaN/Infinity in matrix gracefully', () => {
    const circuit = new Circuit();

    const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
    const diode = new DiodeElement(0, 10, 10, 10);
    const r = new ResistorElement(10, 10, 10, 0, 100);
    const wire = new WireElement(10, 0, 0, 0);
    const ground = new GroundElement(0, 10);

    circuit.addElement(vs);
    circuit.addElement(diode);
    circuit.addElement(r);
    circuit.addElement(wire);
    circuit.addElement(ground);

    circuit.analyzeCircuit();

    expect(circuit.circuitMatrixSize).toBeGreaterThan(0);

    // Using a nonlinear circuit makes matrix size > 0 because diode makes circuit nonlinear,
    // which prevents the matrix rows dropping optimization from removing all rows
    circuit.circuitNonLinear = false;
    circuit.circuitMatrix[0][0] = NaN;

    const result = circuit.runStep();
    expect(result).toBe(false);
    expect(circuit.stopMessage).toBe('NaN/infinite matrix!');
  });

  it('handles singular matrix gracefully for non-linear circuits', () => {
    const circuit = new Circuit();

    const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
    const diode = new DiodeElement(0, 10, 10, 10);
    const r = new ResistorElement(10, 10, 10, 0, 100);
    const wire = new WireElement(10, 0, 0, 0);
    const ground = new GroundElement(0, 10);

    circuit.addElement(vs);
    circuit.addElement(diode);
    circuit.addElement(r);
    circuit.addElement(wire);
    circuit.addElement(ground);

    circuit.analyzeCircuit();
    expect(circuit.circuitMatrixSize).toBeGreaterThan(0);

    const luFactorSpy = vi.spyOn(matrix, 'luFactor').mockReturnValue(false);

    const result = circuit.runStep();

    expect(result).toBe(false);
    expect(circuit.stopMessage).toBe('Singular matrix!');

    luFactorSpy.mockRestore();
  });
});
