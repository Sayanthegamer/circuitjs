import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../circuit';
import { LogicGateElement } from './logic-gate';
import { VoltageSourceElement } from './voltage-source';
import { GroundElement } from './ground';

describe('LogicGateElement', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('NOT Gate', () => {
    it('implements NOT truth table and threshold transition delay', () => {
      const ground = new GroundElement(0, 0);
      const vin = new VoltageSourceElement(0, 0, 0, 10, 0); // starts low (0V)
      const gate = new LogicGateElement(0, 10, 10, 10, 'NOT');
      gate.propagationDelay = 1e-6; // 1us

      circuit.addElement(ground);
      circuit.addElement(vin);
      circuit.addElement(gate);

      circuit.maxTimeStep = 0.5e-6; // 0.5us step size
      circuit.analyzeCircuit();

      // Initially output is set to 5V by reset()
      expect(gate.lastOutVal).toBe(5.0);

      circuit.runStep(); // Step 1: t goes to 0.5us. Output remains 5V.
      expect(gate.lastOutVal).toBe(5.0);

      // Now change input to High (5V)
      vin.maxVoltage = 5.0; // 5V
      circuit.analyzeCircuit(); // re-analyze to apply change

      circuit.runStep(); // Step 2: t goes to 1.0us. (Gate volts updated to 5.0V at end)
      
      // Step 3: starts at 1.0us. gate.doStep sees input is 5V.
      // Schedules transition at 1.0us + 1.0us = 2.0us.
      // Registers breakpoint at 2.0us.
      circuit.runStep(); // Step 3: t goes to 1.5us.
      expect(circuit.breakpoints).toContain(2.0e-6);

      // Step 4: starts at 1.5us. timeStep is shrunk to 0.5us to hit 2.0us breakpoint.
      // At end of step 4, t is 2.0us and output has transitioned.
      circuit.runStep(); // Step 4: t goes to 2.0us (hits breakpoint)
      expect(circuit.t).toBeCloseTo(2.0e-6);
      expect(gate.lastOutVal).toBe(0.0); // Output transitioned to Low!
    });
  });

  describe('AND Gate', () => {
    it('implements AND truth table', () => {
      const ground = new GroundElement(0, -20);
      const vin1 = new VoltageSourceElement(0, -20, 0, 0, 0); // output at (0, 0)
      const vin2 = new VoltageSourceElement(0, -20, 0, 20, 0); // output at (0, 20)
      const gate = new LogicGateElement(0, 10, 10, 10, 'AND'); // inputs at (0, 0) and (0, 20)
      gate.propagationDelay = 1e-6;

      circuit.addElement(ground);
      circuit.addElement(vin1);
      circuit.addElement(vin2);
      circuit.addElement(gate);

      circuit.maxTimeStep = 0.5e-6;
      circuit.analyzeCircuit();

      // Inputs: (0, 0) -> expected output 0V
      expect(gate.lastOutVal).toBe(0.0);

      // Set inputs: (5V, 5V)
      vin1.maxVoltage = 5.0;
      vin2.maxVoltage = 5.0;
      circuit.analyzeCircuit();

      circuit.runStep(); // Step 1: t goes to 0.5us
      circuit.runStep(); // Step 2: t goes to 1.0us (schedules transition at 1.5us)
      expect(circuit.breakpoints).toContain(1.5e-6);

      circuit.runStep(); // Step 3: t goes to 1.5us (hits breakpoint)
      expect(gate.lastOutVal).toBe(5.0); // Output transitioned to High (5V)!
    });
  });

  describe('OR Gate', () => {
    it('implements OR truth table', () => {
      const ground = new GroundElement(0, -20);
      const vin1 = new VoltageSourceElement(0, -20, 0, 0, 5); // output at (0, 0) - starts high
      const vin2 = new VoltageSourceElement(0, -20, 0, 20, 0); // output at (0, 20) - starts low
      const gate = new LogicGateElement(0, 10, 10, 10, 'OR'); // inputs at (0, 0) and (0, 20)
      gate.propagationDelay = 1e-6;

      circuit.addElement(ground);
      circuit.addElement(vin1);
      circuit.addElement(vin2);
      circuit.addElement(gate);

      circuit.maxTimeStep = 0.5e-6;
      circuit.analyzeCircuit();

      circuit.runStep(); // Step 1: t goes to 0.5us. Output remains 0V.
      
      // Step 2: starts at 0.5us. Gate sees input is high, schedules transition at 0.5us + 1.0us = 1.5us.
      circuit.runStep(); // Step 2: t goes to 1.0us.
      expect(circuit.breakpoints).toContain(1.5e-6);

      circuit.runStep(); // Step 3: t goes to 1.5us (hits breakpoint)
      expect(gate.lastOutVal).toBe(5.0);
    });
  });

  describe('Execution Bypass Optimization', () => {
    it('bypasses calculation when inputs are stable', () => {
      const ground = new GroundElement(0, -10);
      const vin = new VoltageSourceElement(0, -10, 0, 0, 5); // output at (0, 0)
      const gate = new LogicGateElement(0, 0, 10, 0, 'NOT'); // input at (0, 0)
      gate.propagationDelay = 1e-6;

      circuit.addElement(ground);
      circuit.addElement(vin);
      circuit.addElement(gate);

      circuit.maxTimeStep = 0.5e-6;
      circuit.analyzeCircuit();

      circuit.runStep(); // Step 1: t goes to 0.5us.
      circuit.runStep(); // Step 2: t goes to 1.0us. Schedules transition to low at 0.5us + 1.0us = 1.5us.
      circuit.runStep(); // Step 3: t goes to 1.5us (hits breakpoint).
      expect(gate.lastOutVal).toBe(0.0);
      expect(gate.nextTransitionTime).toBe(-1);

      // Now inputs are stable and transition is complete.
      // Next runStep should bypass re-evaluation
      const initialTarget = gate.targetOutVal;
      circuit.runStep();
      expect(gate.targetOutVal).toBe(initialTarget);
    });
  });
});
