import { Circuit } from './circuit';
import {
  ResistorElement,
  CapacitorElement,
  InductorElement,
  VoltageSourceElement,
  WireElement,
  GroundElement,
  SwitchElement,
  DiodeElement,
  LEDElement,
} from './elements';

export interface SerializedElement {
  id: string;
  type: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  resistance?: number;
  capacitance?: number;
  inductance?: number;
  maxVoltage?: number;
  closed?: boolean;
  color?: string;
}

export interface SerializedCircuit {
  elements: SerializedElement[];
}

export function serializeCircuit(circuit: Circuit): string {
  const elementsData: SerializedElement[] = circuit.elements.map((elm) => {
    const base: SerializedElement = {
      id: elm.id,
      type: elm.type,
      x: elm.x,
      y: elm.y,
      x2: elm.x2,
      y2: elm.y2,
    };
    if (elm instanceof ResistorElement) {
      base.resistance = elm.resistance;
    } else if (elm instanceof CapacitorElement) {
      base.capacitance = elm.capacitance;
    } else if (elm instanceof InductorElement) {
      base.inductance = elm.inductance;
    } else if (elm instanceof VoltageSourceElement) {
      base.maxVoltage = elm.maxVoltage;
    } else if (elm instanceof SwitchElement) {
      base.closed = elm.closed;
    } else if (elm instanceof LEDElement) {
      base.color = elm.color;
    }
    return base;
  });

  return JSON.stringify({ elements: elementsData });
}

export function deserializeCircuit(circuit: Circuit, jsonStr: string): void {
  const data = JSON.parse(jsonStr) as SerializedCircuit;
  circuit.clearElements();
  if (data && Array.isArray(data.elements)) {
    for (const elm of data.elements) {
      let newElm;
      switch (elm.type) {
        case 'resistor':
          newElm = new ResistorElement(elm.x, elm.y, elm.x2, elm.y2, elm.resistance);
          break;
        case 'capacitor':
          newElm = new CapacitorElement(elm.x, elm.y, elm.x2, elm.y2, elm.capacitance);
          break;
        case 'inductor':
          newElm = new InductorElement(elm.x, elm.y, elm.x2, elm.y2, elm.inductance);
          break;
        case 'voltage':
          newElm = new VoltageSourceElement(elm.x, elm.y, elm.x2, elm.y2, elm.maxVoltage);
          break;
        case 'switch':
          newElm = new SwitchElement(elm.x, elm.y, elm.x2, elm.y2);
          newElm.closed = !!elm.closed;
          break;
        case 'diode':
          newElm = new DiodeElement(elm.x, elm.y, elm.x2, elm.y2);
          break;
        case 'led':
          newElm = new LEDElement(elm.x, elm.y, elm.x2, elm.y2);
          if (elm.color) newElm.color = elm.color;
          break;
        case 'wire':
          newElm = new WireElement(elm.x, elm.y, elm.x2, elm.y2);
          break;
        case 'ground':
          newElm = new GroundElement(elm.x, elm.y);
          break;
      }
      if (newElm) {
        newElm.id = elm.id;
        circuit.addElement(newElm);
      }
    }
  }
}
