import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../circuit';
import { TransformerElement } from './transformer';
import { VoltageSourceElement } from './voltage-source';
import { ResistorElement } from './resistor';
import { GroundElement } from './ground';
import { ACSweepEngine } from '../analysis';

describe('TransformerElement', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  it('clamps coupling coefficient to prevent matrix singularities', () => {
    const tf = new TransformerElement(0, 0, 10, 0);
    tf.inductance1 = 1.0;
    tf.inductance2 = 1.0;
    tf.couplingCoefficient = 1.0; // Perfect coupling

    circuit.addElement(tf);
    circuit.analyzeCircuit();

    // Force a transient stamp simulation step
    // The stamp uses clamped coupling coefficient to compute Req parameters
    const mockStamper = {
      isDCOperatingPoint: false,
      isACSweep: false,
      isBackwardEuler: false,
      timeStep: 1e-3,
      stampConductance: () => {},
      stampMatrix: () => {},
      stampRightSide: () => {},
      stampCurrentSource: () => {}
    };

    tf.stamp(mockStamper as any);

    const Req1 = (tf as any).Req1;
    const Req2 = (tf as any).Req2;
    const ReqM = (tf as any).ReqM;

    // With perfect coupling, k is clamped to 0.99999.
    // Thus ReqM = k * sqrt(Req1 * Req2) < sqrt(Req1 * Req2)
    expect(ReqM).toBeLessThan(Math.sqrt(Req1 * Req2));
  });

  it('acts as decoupled when coupling coefficient k = 0', () => {
    // Transformer horizontal at x=10 to x=20, y=10
    // Posts: p0 = (10, -6), p1 = (10, 26), p2 = (20, -6), p3 = (20, 26)
    const tf = new TransformerElement(10, 10, 20, 10);
    tf.inductance1 = 1.0;
    tf.inductance2 = 1.0;
    tf.couplingCoefficient = 0.0; // No coupling
    tf.seriesResistance1 = 0.01;
    tf.seriesResistance2 = 0.01;

    // vs primary source: (10, -20) to (10, -6)
    const vs = new VoltageSourceElement(10, -20, 10, -6, 10.0); 
    vs.waveform = 'AC';

    // grounds
    const gnd1 = new GroundElement(10, -20); // primary source ground
    const gnd2 = new GroundElement(10, 26);  // primary winding ground
    const gnd3 = new GroundElement(20, 26);  // secondary winding ground

    // Load resistor: (20, -6) to (20, -20)
    const rLoad = new ResistorElement(20, -6, 20, -20, 1000.0);
    const gndLoad = new GroundElement(20, -20); // load ground

    circuit.addElement(vs);
    circuit.addElement(tf);
    circuit.addElement(gnd1);
    circuit.addElement(gnd2);
    circuit.addElement(gnd3);
    circuit.addElement(rLoad);
    circuit.addElement(gndLoad);

    circuit.analyzeCircuit();

    const points = ACSweepEngine.runSweep(circuit, 10, 100, 2);
    expect(points.length).toBeGreaterThan(0);

    // Secondary winding output node (post 2 of tf) should be exactly 0
    const outNode = tf.nodes[2];
    const vOut = points[0].voltages[outNode];
    expect(vOut.vReal).toBeCloseTo(0.0, 4);
    expect(vOut.vImag).toBeCloseTo(0.0, 4);
  });

  it('acts as 1:2 step-up transformer under high coupling k = 0.99', () => {
    // Vin = 5V amplitude AC
    const vs = new VoltageSourceElement(10, -20, 10, -6, 5.0);
    vs.waveform = 'AC';

    // Step-up 1:2 => L1 = 1H, L2 = 4H
    const tf = new TransformerElement(10, 10, 20, 10);
    tf.inductance1 = 1.0;
    tf.inductance2 = 4.0;
    tf.couplingCoefficient = 0.99;
    tf.seriesResistance1 = 0.001;
    tf.seriesResistance2 = 0.001;

    // grounds
    const gnd1 = new GroundElement(10, -20); // primary source ground
    const gnd2 = new GroundElement(10, 26);  // primary winding ground
    const gnd3 = new GroundElement(20, 26);  // secondary winding ground

    // Load resistor: (20, -6) to (20, -20) - High load resistance to prevent loading drop
    const rLoad = new ResistorElement(20, -6, 20, -20, 1e9);
    const gndLoad = new GroundElement(20, -20); // load ground

    circuit.addElement(vs);
    circuit.addElement(tf);
    circuit.addElement(gnd1);
    circuit.addElement(gnd2);
    circuit.addElement(gnd3);
    circuit.addElement(rLoad);
    circuit.addElement(gndLoad);

    circuit.analyzeCircuit();

    // Run sweep at high frequency (1 kHz) where reactances are large
    const points = ACSweepEngine.runSweep(circuit, 1000, 2000, 1);
    expect(points.length).toBeGreaterThan(0);

    const pt = points[0];
    const outNode = tf.nodes[2];
    const vOutNode = pt.voltages[outNode];
    const vOutMag = Math.hypot(vOutNode.vReal, vOutNode.vImag);

    // Expected output: Vin * turnsRatio * k = 5V * 2 * 0.99 = 9.9V
    expect(vOutMag).toBeCloseTo(9.9, 2);
  });
});
