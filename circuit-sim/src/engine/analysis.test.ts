import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from './circuit';
import { ACSweepEngine } from './analysis';
import { VoltageSourceElement } from './elements/voltage-source';
import { ResistorElement } from './elements/resistor';
import { CapacitorElement } from './elements/capacitor';
import { GroundElement } from './elements/ground';
import { DiodeElement } from './elements/diode';

describe('Multi-Mode Simulation: DC OP and AC Sweep', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('DC Operating Point (DC OP)', () => {
    it('solves simple linear circuit voltages exactly', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 10); // 10V
      const r1 = new ResistorElement(0, 10, 10, 10, 1000); // 1k
      const r2 = new ResistorElement(10, 10, 20, 10, 1000); // 1k (voltage divider)
      const gnd = new GroundElement(0, 0);
      const gnd2 = new GroundElement(20, 10); // Connect bottom of r2 to ground

      circuit.addElement(vs);
      circuit.addElement(r1);
      circuit.addElement(r2);
      circuit.addElement(gnd);
      circuit.addElement(gnd2);

      circuit.analyzeCircuit();

      const success = circuit.computeDCOperatingPoint();
      expect(success).toBe(true);

      // Node voltages:
      // Node 1: output of VS (should be 10V)
      // Node 2: middle of voltage divider (should be 5V)
      expect(circuit.nodeVoltages[0]).toBeCloseTo(10.0, 4);
      expect(circuit.nodeVoltages[1]).toBeCloseTo(5.0, 4);
    });

    it('homotopy loop converges for non-linear diode circuit', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 5.0); // 5V
      const r = new ResistorElement(0, 10, 10, 10, 100);    // 100 Ohm
      const diode = new DiodeElement(10, 10, 20, 10);       // Diode to ground
      const gnd = new GroundElement(0, 0);                  // Ground at input
      const gnd2 = new GroundElement(20, 10);               // Ground at diode cathode

      circuit.addElement(vs);
      circuit.addElement(r);
      circuit.addElement(diode);
      circuit.addElement(gnd);
      circuit.addElement(gnd2);

      circuit.analyzeCircuit();

      const success = circuit.computeDCOperatingPoint();
      expect(success).toBe(true);

      // Diode junction voltage is typically around 0.6V to 0.8V for forward bias of 5V through 100 Ohms
      const vDiode = circuit.nodeVoltages[1];
      expect(vDiode).toBeGreaterThan(0.5);
      expect(vDiode).toBeLessThan(0.9);

      // Verify KCL: I_diode = I_resistor
      // Resistor current = (V_node1 - V_node2) / 100
      const vVs = circuit.nodeVoltages[0];
      expect(vVs).toBeCloseTo(5.0, 4);

      const iRes = (vVs - vDiode) / 100;
      diode.calculateCurrent();
      expect(diode.getCurrent()).toBeCloseTo(iRes, 4);
    });
  });

  describe('AC Frequency Sweep Analysis', () => {
    it('computes correct transfer function (magnitude/phase) of RC Low-Pass filter', () => {
      const vs = new VoltageSourceElement(0, 0, 0, 10, 1.0); // 1V Amplitude
      vs.waveform = 'AC';
      vs.frequency = 1000;
      
      const r = new ResistorElement(0, 10, 10, 10, 1000);   // R = 1k Ohm
      const c = new CapacitorElement(10, 10, 20, 10, 1e-6); // C = 1uF
      c.esr = 0.0; // Set ideal capacitor for simplicity

      const gnd = new GroundElement(0, 0);                  // Ground at input reference
      const gnd2 = new GroundElement(20, 10);               // Ground at capacitor bottom

      circuit.addElement(vs);
      circuit.addElement(r);
      circuit.addElement(c);
      circuit.addElement(gnd);
      circuit.addElement(gnd2);

      circuit.analyzeCircuit();

      // Run AC frequency sweep from 1 Hz to 10 kHz
      const points = ACSweepEngine.runSweep(circuit, 1, 10000, 10);
      expect(points.length).toBeGreaterThan(2);

      // Theoretical Cutoff Frequency fc = 1 / (2 * pi * R * C) ≈ 159.155 Hz
      const fc = 159.155;

      // Let's find the frequency point closest to cutoff frequency fc
      let bestPoint = points[0];
      let minDist = Math.abs(points[0].freq - fc);
      for (const pt of points) {
        const d = Math.abs(pt.freq - fc);
        if (d < minDist) {
          minDist = d;
          bestPoint = pt;
        }
      }

      // At cutoff frequency:
      // - Node 2 voltage real part should be ~0.5V, imaginary part ~ -0.5V
      // - Magnitude = sqrt(real^2 + imag^2) = 1 / sqrt(2) ≈ 0.707V
      // - db = 20 * log10(0.707) ≈ -3 dB
      // - phase = atan2(imag, real) ≈ -45 degrees
      const vOut = bestPoint.voltages[2]; // Node 2 is the output node
      const mag = Math.hypot(vOut.vReal, vOut.vImag);
      const db = 20 * Math.log10(mag);
      const phase = Math.atan2(vOut.vImag, vOut.vReal) * (180 / Math.PI);

      expect(mag).toBeCloseTo(0.707, 2);
      expect(db).toBeCloseTo(-3.01, 1);
      expect(phase).toBeCloseTo(-45.0, 0);

      // Verify low frequency response (1 Hz): should be almost ideal 1.0V with phase 0
      const lowPt = points[0]; // first point is 1 Hz
      const vLow = lowPt.voltages[2];
      const lowMag = Math.hypot(vLow.vReal, vLow.vImag);
      const lowPhase = Math.atan2(vLow.vImag, vLow.vReal) * (180 / Math.PI);

      expect(lowMag).toBeCloseTo(1.0, 3);
      expect(lowPhase).toBeCloseTo(0.0, 0);

      // Verify high frequency response (10 kHz): magnitude should be very small (~0.016), phase should be close to -90
      const highPt = points[points.length - 1]; // 10 kHz
      const vHigh = highPt.voltages[2];
      const highMag = Math.hypot(vHigh.vReal, vHigh.vImag);
      const highPhase = Math.atan2(vHigh.vImag, vHigh.vReal) * (180 / Math.PI);

      expect(highMag).toBeLessThan(0.02);
      expect(Math.abs(highPhase - -90.0)).toBeLessThan(2.0);
    });
  });
});
