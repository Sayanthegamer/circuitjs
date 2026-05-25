import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../circuit';
import { CapacitorElement } from './capacitor';
import { InductorElement } from './inductor';
import { ResistorElement } from './resistor';
import { VoltageSourceElement } from './voltage-source';
import { GroundElement } from './ground';
import { WireElement } from './wire';

describe('Component Parasitics (ESR & Winding Resistance)', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('Capacitor ESR', () => {
    it('behaves like an ideal capacitor when ESR is 0', () => {
      // Create RC circuit with ESR = 0
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10);
      const r = new ResistorElement(0, 10, 10, 10, 100);
      const cap = new CapacitorElement(10, 10, 10, 0, 1e-6);
      cap.esr = 0; // set ESR to 0 (ideal)
      const wire = new WireElement(10, 0, 0, 0); // complete loop back to ground
      const ground = new GroundElement(0, 0);

      circuit.addElement(vs);
      circuit.addElement(r);
      circuit.addElement(cap);
      circuit.addElement(wire);
      circuit.addElement(ground);

      circuit.maxTimeStep = 1e-4; // 100us
      circuit.analyzeCircuit();

      // Theoretical charging time constant tau = R * C = 100 * 1uF = 100us
      // Run first step (t = 100us):
      // The first step uses Backward Euler integration (isBackwardEuler = true), so:
      // Req = dt / C = 100us / 1uF = 100 ohms
      // Total loop resistance = R + Req = 100 + 100 = 200 ohms
      // Initial step current = V / (R + Req) = 10V / 200 = 0.05 A
      circuit.runStep();
      expect(cap.getCurrent()).toBeCloseTo(0.05, 3);
    });

    it('limits initial inrush current under voltage source step when ESR is present', () => {
      // Connect 1F capacitor (extremely large to keep V_C ~ 0) with 2 Ohm ESR directly to 10V source
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10);
      const cap = new CapacitorElement(0, 10, 10, 10, 1.0); // 1F
      cap.esr = 2.0; // 2 Ohms ESR
      const wire = new WireElement(10, 10, 0, 0); // complete loop
      const ground = new GroundElement(0, 0);

      circuit.addElement(vs);
      circuit.addElement(cap);
      circuit.addElement(wire);
      circuit.addElement(ground);

      circuit.maxTimeStep = 1e-6; // 1us (extremely small to keep V_C = 0)
      circuit.analyzeCircuit();

      // At t = 0+, since V_C is 0, the current should be limited only by ESR:
      circuit.runStep();
      expect(cap.getCurrent()).toBeCloseTo(5.0, 2);
    });

    it('converges to 0 current in steady state under constant DC voltage', () => {
      // Connect 1uF capacitor with 2 Ohm ESR directly to 10V source
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10);
      const cap = new CapacitorElement(0, 10, 10, 10, 1e-6); // 1uF
      cap.esr = 2.0; // 2 Ohms ESR
      const wire = new WireElement(10, 10, 0, 0); // complete loop
      const ground = new GroundElement(0, 0);

      circuit.addElement(vs);
      circuit.addElement(cap);
      circuit.addElement(wire);
      circuit.addElement(ground);

      circuit.maxTimeStep = 1e-5; // 10us steps
      circuit.analyzeCircuit();

      for (let i = 0; i < 20; i++) {
        circuit.runStep();
      }

      // At steady state, the capacitor should be fully charged to 10V, and current should be 0.
      expect(cap.getCurrent()).toBeCloseTo(0.0, 4);
    });
  });

  describe('Inductor Winding Resistance', () => {
    it('behaves like an ideal inductor when winding resistance is 0', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10);
      const r = new ResistorElement(0, 10, 10, 10, 100);
      const ind = new InductorElement(10, 10, 10, 0, 1e-3); // 1mH
      ind.seriesResistance = 0;
      const wire = new WireElement(10, 0, 0, 0); // complete loop back to ground
      const ground = new GroundElement(0, 0);

      circuit.addElement(vs);
      circuit.addElement(r);
      circuit.addElement(ind);
      circuit.addElement(wire);
      circuit.addElement(ground);

      circuit.maxTimeStep = 1e-5; // 10us
      circuit.analyzeCircuit();

      // Theoretical charging time constant tau = L / R = 1mH / 100 = 10us
      // The first step uses Backward Euler integration (isBackwardEuler = true), so:
      // Req = L / dt = 1mH / 10us = 100 ohms
      // Total loop resistance = R + Req = 100 + 100 = 200 ohms
      // Initial step current = V / (R + Req) = 10V / 200 = 0.05 A
      circuit.runStep();
      expect(ind.getCurrent()).toBeCloseTo(0.05, 3);
    });

    it('limits steady-state current and winding resistance convergence', () => {
      // Connect 10V source directly across a 0.1H inductor with 2 Ohm series winding resistance
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10);
      const ind = new InductorElement(0, 10, 10, 10, 0.1); // 0.1H (smaller tau = 50ms to converge faster)
      ind.seriesResistance = 2.0; // 2 Ohms winding resistance
      const wire = new WireElement(10, 10, 0, 0);
      const ground = new GroundElement(0, 0);

      circuit.addElement(vs);
      circuit.addElement(ind);
      circuit.addElement(wire);
      circuit.addElement(ground);

      circuit.maxTimeStep = 0.1; // 100ms steps, so 20 steps = 2.0s = 40 tau
      circuit.analyzeCircuit();

      // Let the circuit simulate for several steps to reach steady state
      for (let i = 0; i < 20; i++) {
        circuit.runStep();
      }

      // At steady state, the inductor current should be:
      // I = V_source / R_series = 10V / 2 Ohm = 5 A.
      expect(ind.getCurrent()).toBeCloseTo(5.0, 2);
    });
  });
});
