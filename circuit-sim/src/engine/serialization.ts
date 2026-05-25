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
  BJTElement,
  CurrentSourceElement,
  LogicGateElement,
  TransformerElement,
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
  isNpn?: boolean;
  bf?: number;
  br?: number;
  currentValue?: number;
  waveform?: 'DC' | 'AC' | 'SQUARE' | 'TRIANGLE' | 'PULSE' | 'PWL';
  frequency?: number;
  dutyCycle?: number;
  bias?: number;
  pwlPoints?: { t: number; v: number }[];
  esr?: number;
  seriesResistance?: number;
  gateType?: 'AND' | 'OR' | 'NOT';
  vHigh?: number;
  vLow?: number;
  vThreshold?: number;
  propagationDelay?: number;
  couplingCoefficient?: number;
  inductance1?: number;
  inductance2?: number;
  seriesResistance1?: number;
  seriesResistance2?: number;
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
      base.esr = elm.esr;
    } else if (elm instanceof InductorElement) {
      base.inductance = elm.inductance;
      base.seriesResistance = elm.seriesResistance;
    } else if (elm instanceof VoltageSourceElement) {
      base.maxVoltage = elm.maxVoltage;
      base.waveform = elm.waveform;
      base.frequency = elm.frequency;
      base.dutyCycle = elm.dutyCycle;
      base.bias = elm.bias;
      base.pwlPoints = elm.pwlPoints;
    } else if (elm instanceof SwitchElement) {
      base.closed = elm.closed;
    } else if (elm instanceof LEDElement) {
      base.color = elm.color;
    } else if (elm instanceof BJTElement) {
      base.isNpn = elm.isNpn;
      base.bf = elm.bf;
      base.br = elm.br;
    } else if (elm instanceof CurrentSourceElement) {
      base.currentValue = elm.currentValue;
    } else if (elm instanceof LogicGateElement) {
      base.gateType = elm.gateType;
      base.vHigh = elm.vHigh;
      base.vLow = elm.vLow;
      base.vThreshold = elm.vThreshold;
      base.propagationDelay = elm.propagationDelay;
    } else if (elm instanceof TransformerElement) {
      base.couplingCoefficient = elm.couplingCoefficient;
      base.inductance1 = elm.inductance1;
      base.inductance2 = elm.inductance2;
      base.seriesResistance1 = elm.seriesResistance1;
      base.seriesResistance2 = elm.seriesResistance2;
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
          if (elm.esr !== undefined) newElm.esr = elm.esr;
          break;
        case 'inductor':
          newElm = new InductorElement(elm.x, elm.y, elm.x2, elm.y2, elm.inductance);
          if (elm.seriesResistance !== undefined) newElm.seriesResistance = elm.seriesResistance;
          break;
        case 'voltage':
          newElm = new VoltageSourceElement(elm.x, elm.y, elm.x2, elm.y2, elm.maxVoltage);
          if (elm.waveform) newElm.waveform = elm.waveform;
          if (elm.frequency !== undefined) newElm.frequency = elm.frequency;
          if (elm.dutyCycle !== undefined) newElm.dutyCycle = elm.dutyCycle;
          if (elm.bias !== undefined) newElm.bias = elm.bias;
          if (elm.pwlPoints) newElm.pwlPoints = elm.pwlPoints;
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
        case 'bjt':
          newElm = new BJTElement(elm.x, elm.y, elm.x2, elm.y2, elm.isNpn ?? true);
          if (elm.bf !== undefined) newElm.bf = elm.bf;
          if (elm.br !== undefined) newElm.br = elm.br;
          break;
        case 'current_source':
          newElm = new CurrentSourceElement(elm.x, elm.y, elm.x2, elm.y2, elm.currentValue ?? 0.002);
          break;
        case 'logic_gate':
          newElm = new LogicGateElement(elm.x, elm.y, elm.x2, elm.y2, elm.gateType ?? 'AND');
          if (elm.vHigh !== undefined) newElm.vHigh = elm.vHigh;
          if (elm.vLow !== undefined) newElm.vLow = elm.vLow;
          if (elm.vThreshold !== undefined) newElm.vThreshold = elm.vThreshold;
          if (elm.propagationDelay !== undefined) newElm.propagationDelay = elm.propagationDelay;
          break;
        case 'transformer':
          newElm = new TransformerElement(elm.x, elm.y, elm.x2, elm.y2);
          if (elm.couplingCoefficient !== undefined) newElm.couplingCoefficient = elm.couplingCoefficient;
          if (elm.inductance1 !== undefined) newElm.inductance1 = elm.inductance1;
          if (elm.inductance2 !== undefined) newElm.inductance2 = elm.inductance2;
          if (elm.seriesResistance1 !== undefined) newElm.seriesResistance1 = elm.seriesResistance1;
          if (elm.seriesResistance2 !== undefined) newElm.seriesResistance2 = elm.seriesResistance2;
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
