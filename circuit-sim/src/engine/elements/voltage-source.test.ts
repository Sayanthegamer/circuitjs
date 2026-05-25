import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../circuit';
import { VoltageSourceElement } from './voltage-source';
import { ResistorElement } from './resistor';
import { GroundElement } from './ground';

describe('VoltageSourceElement & Breakpoint Integration', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('Waveform Generation', () => {
    it('generates correct SQUARE wave voltages and registers breakpoints', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      vs.waveform = 'SQUARE';
      vs.frequency = 50; // Period = 20ms
      vs.dutyCycle = 0.5;
      vs.bias = 1;

      // at t = 0 (start of period, should be high)
      expect(vs.getVoltage(0)).toBe(6); // 1 + 5 = 6V
      // at t = 5ms (first half of period, high)
      expect(vs.getVoltage(0.005)).toBe(6);
      // at t = 10ms (dutyCycle = 0.5, switch to low)
      expect(vs.getVoltage(0.010)).toBe(-4); // 1 - 5 = -4V
      // at t = 15ms (low)
      expect(vs.getVoltage(0.015)).toBe(-4);
      // at t = 20ms (start of next period, high)
      expect(vs.getVoltage(0.020)).toBe(6);

      // Check breakpoints registration
      circuit.addElement(vs);
      circuit.addElement(new ResistorElement(0, 10, 10, 10, 100));
      circuit.addElement(new GroundElement(0, 0));
      circuit.analyzeCircuit();

      // At t = 0, next transitions: 10ms, 20ms, 30ms
      expect(circuit.breakpoints).toContain(0.010);
      expect(circuit.breakpoints).toContain(0.020);
      expect(circuit.breakpoints).toContain(0.030);
    });

    it('generates correct PULSE wave voltages', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      vs.waveform = 'PULSE';
      vs.frequency = 100; // Period = 10ms
      vs.dutyCycle = 0.2; // 2ms on, 8ms off
      vs.bias = 2;

      expect(vs.getVoltage(0)).toBe(7); // bias + max = 7
      expect(vs.getVoltage(0.001)).toBe(7);
      expect(vs.getVoltage(0.002)).toBe(2); // exactly at cutoff, goes low (bias)
      expect(vs.getVoltage(0.005)).toBe(2);
      expect(vs.getVoltage(0.010)).toBe(7);
    });

    it('generates correct TRIANGLE wave voltages and registers vertex breakpoints', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      vs.waveform = 'TRIANGLE';
      vs.frequency = 100; // Period = 10ms
      vs.bias = 0;

      // at t = 0: bias - max = -5V
      expect(vs.getVoltage(0)).toBeCloseTo(-5);
      // at t = 2.5ms (1/4 cycle): bias = 0V
      expect(vs.getVoltage(0.0025)).toBeCloseTo(0);
      // at t = 5.0ms (1/2 cycle): bias + max = 5V
      expect(vs.getVoltage(0.005)).toBeCloseTo(5);
      // at t = 7.5ms (3/4 cycle): bias = 0V
      expect(vs.getVoltage(0.0075)).toBeCloseTo(0);
      // at t = 10ms (1 cycle): bias - max = -5V
      expect(vs.getVoltage(0.010)).toBeCloseTo(-5);

      circuit.addElement(vs);
      circuit.addElement(new ResistorElement(0, 10, 10, 10, 100));
      circuit.addElement(new GroundElement(0, 0));
      circuit.analyzeCircuit();

      // Breakpoints at vertices: 5ms, 10ms, 15ms, etc.
      expect(circuit.breakpoints).toContain(0.005);
      expect(circuit.breakpoints).toContain(0.010);
    });

    it('generates correct PWL wave voltages and registers breakpoints', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      vs.waveform = 'PWL';
      vs.bias = 1;
      vs.pwlPoints = [
        { t: 0, v: 0 },
        { t: 0.001, v: 2 },
        { t: 0.003, v: 10 },
        { t: 0.004, v: 0 },
      ];

      expect(vs.getVoltage(0)).toBe(0);
      expect(vs.getVoltage(0.0005)).toBe(1); // mid-point
      expect(vs.getVoltage(0.002)).toBe(6); // mid-point between 2V and 10V
      expect(vs.getVoltage(0.003)).toBe(10);
      expect(vs.getVoltage(0.005)).toBe(0); // past the last point

      circuit.addElement(vs);
      circuit.addElement(new ResistorElement(0, 10, 10, 10, 100));
      circuit.addElement(new GroundElement(0, 0));
      circuit.analyzeCircuit();

      expect(circuit.breakpoints).toContain(0.001);
      expect(circuit.breakpoints).toContain(0.003);
      expect(circuit.breakpoints).toContain(0.004);
    });
  });

  describe('Breakpoint Solver Integration', () => {
    it('shrinks timestep to hit breakpoints and forces Backward Euler', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      vs.waveform = 'SQUARE';
      vs.frequency = 1000; // Period = 1ms
      vs.dutyCycle = 0.5; // Next transition at 0.5ms

      circuit.addElement(vs);
      circuit.addElement(new ResistorElement(0, 10, 10, 10, 100));
      circuit.addElement(new GroundElement(0, 0));

      circuit.maxTimeStep = 3e-4; // 0.3ms
      circuit.analyzeCircuit();

      // At t = 0: next breakpoint is 0.5ms.
      // Run first step (t goes from 0 to 0.3ms)
      circuit.runStep();
      expect(circuit.t).toBeCloseTo(3e-4);
      expect(circuit.timeStep).toBe(3e-4);
      expect(circuit.isBackwardEuler).toBe(false);

      // Run second step.
      // The normal step would go to 0.6ms, which overshoots 0.5ms.
      // So the solver should shrink the timestep to 0.2ms to land exactly on 0.5ms.
      circuit.runStep();
      expect(circuit.t).toBeCloseTo(0.5e-3);
      expect(circuit.timeStep).toBeCloseTo(0.2e-3);
      expect(circuit.isBackwardEuler).toBe(false);
      expect((circuit as any).stampedBackwardEuler).toBe(true); // Verifies isBackwardEuler was forced during the step
    });

    it('enforces MIN_STEP safety clamp and discards near-simultaneous breakpoints', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5);
      circuit.addElement(vs);
      circuit.addElement(new ResistorElement(0, 10, 10, 10, 100));
      circuit.addElement(new GroundElement(0, 0));

      circuit.maxTimeStep = 1e-4;
      circuit.analyzeCircuit();

      // Manually register two near-simultaneous breakpoints
      circuit.registerBreakpoint(5e-5);
      circuit.registerBreakpoint(5e-5 + 1e-10); // 100ps later (less than 1ns MIN_STEP)

      // First runStep should shrink step to hit 5e-5
      circuit.runStep();
      expect(circuit.t).toBeCloseTo(5e-5);

      // The second breakpoint (5e-5 + 1e-10) is too close to current time (5e-5)
      // and should be discarded. The next step should revert to maxTimeStep.
      circuit.runStep();
      expect(circuit.t).toBeCloseTo(5e-5 + 1e-4);
      expect(circuit.timeStep).toBe(1e-4);
    });
  });
});
