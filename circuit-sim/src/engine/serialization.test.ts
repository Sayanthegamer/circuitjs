import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from './circuit';
import { serializeCircuit, deserializeCircuit } from './serialization';
import {
  ResistorElement,
  CapacitorElement,
  VoltageSourceElement,
  WireElement,
  GroundElement,
  LogicGateElement,
  TransformerElement,
  SwitchElement,
} from './elements';

describe('serialization', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  it('should serialize and deserialize an empty circuit', () => {
    const jsonStr = serializeCircuit(circuit);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.elements).toEqual([]);

    const newCircuit = new Circuit();
    deserializeCircuit(newCircuit, jsonStr);
    expect(newCircuit.elements.length).toBe(0);
  });

  it('should serialize and deserialize basic elements', () => {
    const r1 = new ResistorElement(0, 0, 10, 0, 1000);
    const w1 = new WireElement(10, 0, 20, 0);
    const g1 = new GroundElement(20, 0);

    circuit.addElement(r1);
    circuit.addElement(w1);
    circuit.addElement(g1);

    const jsonStr = serializeCircuit(circuit);

    const newCircuit = new Circuit();
    deserializeCircuit(newCircuit, jsonStr);

    expect(newCircuit.elements.length).toBe(3);

    const newR1 = newCircuit.elements.find(e => e.id === r1.id) as ResistorElement;
    expect(newR1).toBeDefined();
    expect(newR1.type).toBe('resistor');
    expect(newR1.resistance).toBe(1000);
    expect(newR1.x).toBe(0);
    expect(newR1.x2).toBe(10);
    expect(newR1.y).toBe(0);
    expect(newR1.y2).toBe(0);

    const newW1 = newCircuit.elements.find(e => e.id === w1.id) as WireElement;
    expect(newW1).toBeDefined();
    expect(newW1!.type).toBe('wire');
    expect(newW1.x).toBe(10);
    expect(newW1.x2).toBe(20);
    expect(newW1.y).toBe(0);
    expect(newW1.y2).toBe(0);

    const newG1 = newCircuit.elements.find(e => e.id === g1.id) as GroundElement;
    expect(newG1).toBeDefined();
    expect(newG1!.type).toBe('ground');
    expect(newG1.x).toBe(20);
    expect(newG1.y).toBe(0);
  });

  it('should serialize and deserialize complex elements with properties', () => {
    const c1 = new CapacitorElement(0, 0, 10, 10, 0.001);
    c1.esr = 0.5;

    const v1 = new VoltageSourceElement(10, 10, 20, 20, 5);
    v1.waveform = 'SQUARE';
    v1.frequency = 1000;
    v1.dutyCycle = 0.4;
    v1.bias = 2.5;

    const t1 = new TransformerElement(20, 20, 30, 30);
    t1.couplingCoefficient = 0.98;
    t1.inductance1 = 1;
    t1.inductance2 = 2;

    const l1 = new LogicGateElement(30, 30, 40, 40, 'OR');
    l1.vHigh = 3.3;
    l1.vLow = 0.1;
    l1.vThreshold = 1.6;

    const s1 = new SwitchElement(40, 40, 50, 50);
    s1.closed = true;

    circuit.addElement(c1);
    circuit.addElement(v1);
    circuit.addElement(t1);
    circuit.addElement(l1);
    circuit.addElement(s1);

    const jsonStr = serializeCircuit(circuit);

    const newCircuit = new Circuit();
    deserializeCircuit(newCircuit, jsonStr);

    expect(newCircuit.elements.length).toBe(5);

    const newC1 = newCircuit.elements.find(e => e.id === c1.id) as CapacitorElement;
    expect(newC1.capacitance).toBe(0.001);
    expect(newC1.esr).toBe(0.5);

    const newV1 = newCircuit.elements.find(e => e.id === v1.id) as VoltageSourceElement;
    expect(newV1.waveform).toBe('SQUARE');
    expect(newV1.frequency).toBe(1000);
    expect(newV1.dutyCycle).toBe(0.4);
    expect(newV1.bias).toBe(2.5);
    expect(newV1.maxVoltage).toBe(5);

    const newT1 = newCircuit.elements.find(e => e.id === t1.id) as TransformerElement;
    expect(newT1.couplingCoefficient).toBe(0.98);
    expect(newT1.inductance1).toBe(1);
    expect(newT1.inductance2).toBe(2);

    const newL1 = newCircuit.elements.find(e => e.id === l1.id) as LogicGateElement;
    expect(newL1.gateType).toBe('OR');
    expect(newL1.vHigh).toBe(3.3);
    expect(newL1.vLow).toBe(0.1);
    expect(newL1.vThreshold).toBe(1.6);

    const newS1 = newCircuit.elements.find(e => e.id === s1.id) as SwitchElement;
    expect(newS1.closed).toBe(true);
  });

  it('should clear existing elements before deserialization', () => {
    circuit.addElement(new ResistorElement(0, 0, 10, 0, 100));
    circuit.addElement(new ResistorElement(10, 0, 20, 0, 200));
    expect(circuit.elements.length).toBe(2);

    const emptyJsonStr = JSON.stringify({ elements: [] });
    deserializeCircuit(circuit, emptyJsonStr);
    expect(circuit.elements.length).toBe(0);
  });

  it('should handle invalid JSON strings gracefully by throwing an error', () => {
    expect(() => {
      deserializeCircuit(circuit, 'invalid json');
    }).toThrow(SyntaxError);
  });

  it('should handle JSON with missing elements array without crashing', () => {
    const jsonStr = JSON.stringify({ otherKey: 'value' });
    deserializeCircuit(circuit, jsonStr);
    expect(circuit.elements.length).toBe(0);
  });
});
