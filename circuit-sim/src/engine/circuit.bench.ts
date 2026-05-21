import { describe, bench } from 'vitest';
import { Circuit } from './circuit';
import { ResistorElement } from './elements/resistor';

describe('Circuit Element Lookup Performance', () => {
  const setupCircuit = (size: number) => {
    const circuit = new Circuit();
    for (let i = 0; i < size; i++) {
      const el = new ResistorElement(0, 0, 10, 10, 1000);
      Object.assign(el, { id: `r${i}` });
      circuit.addElement(el);
    }
    return circuit;
  };

  const circuit1k = setupCircuit(1000);
  const circuit10k = setupCircuit(10000);

  bench('getElement (1000 elements) - existing item', () => {
    circuit1k.getElement('r500');
  });

  bench('getElement (10000 elements) - existing item', () => {
    circuit10k.getElement('r5000');
  });

  bench('getElement (1000 elements) - missing item', () => {
    circuit1k.getElement('missing');
  });

  bench('updateVoltages inner loop equivalent (1000 elements)', () => {
    // simulate the find loop in updateVoltages
    for (let i = 0; i < 100; i++) {
      circuit1k.elementMap.get(`r${i}`);
    }
  });
});
