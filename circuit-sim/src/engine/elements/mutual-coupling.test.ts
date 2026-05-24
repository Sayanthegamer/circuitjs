import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../circuit';
import { InductorElement } from './inductor';
import { MutualCouplingElement } from './mutual-coupling';
import { VoltageSourceElement } from './voltage-source';
import { ResistorElement } from './resistor';
import { GroundElement } from './ground';
import { ACSweepEngine } from '../analysis';

describe('MutualCouplingElement', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  it('clamps coupling coefficient to prevent matrix singularities', () => {
    const ind1 = new InductorElement(0, 10, 10, 10, 1.0);
    const ind2 = new InductorElement(10, 20, 20, 20, 1.0);
    const mc = new MutualCouplingElement(0, 0, 10, 0);
    mc.ind1Id = ind1.id;
    mc.ind2Id = ind2.id;
    mc.couplingCoefficient = 1.0; // Perfect coupling

    circuit.addElement(ind1);
    circuit.addElement(ind2);
    circuit.addElement(mc);

    circuit.analyzeCircuit();

    // Verify it clamped k in the stamp logic
    (mc as any).stamp(circuit);
    expect((mc as any).couplingCoefficient).toBe(1.0);
    
    // In stamp, the Req calculation should use clamped k = 0.99999
    // ReqM = k * sqrt(L1 * L2) / dt
    // If it clamped correctly, ReqM should be slightly less than sqrt(Req1 * Req2)
    const Req1 = (mc as any).Req1;
    const Req2 = (mc as any).Req2;
    const ReqM = (mc as any).ReqM;
    expect(ReqM).toBeLessThan(Math.sqrt(Req1 * Req2));
  });

  it('acts as decoupled when coupling coefficient k = 0', () => {
    const vs = new VoltageSourceElement(0, 0, 0, 10, 10.0); // 10V AC
    vs.waveform = 'AC';
    
    const ind1 = new InductorElement(0, 10, 10, 10, 1.0);
    ind1.seriesResistance = 0.1;

    const ind2 = new InductorElement(10, 20, 20, 20, 1.0);
    ind2.seriesResistance = 0.1;

    const mc = new MutualCouplingElement(0, 0, 10, 0);
    mc.ind1Id = ind1.id;
    mc.ind2Id = ind2.id;
    mc.couplingCoefficient = 0.0; // No coupling

    const gnd = new GroundElement(0, 0);
    const gnd2 = new GroundElement(20, 20);

    circuit.addElement(vs);
    circuit.addElement(ind1);
    circuit.addElement(ind2);
    circuit.addElement(mc);
    circuit.addElement(gnd);
    circuit.addElement(gnd2);

    circuit.analyzeCircuit();

    const points = ACSweepEngine.runSweep(circuit, 10, 100, 2);
    expect(points.length).toBeGreaterThan(0);

    // Node voltages for Inductor 2 should be exactly 0 since there is no coupling
    const ind2Node = ind2.getNode(0);
    const vOut = points[0].voltages[ind2Node];
    expect(vOut.vReal).toBeCloseTo(0.0, 4);
    expect(vOut.vImag).toBeCloseTo(0.0, 4);
  });

  it('acts as 1:1 transformer under high coupling k = 0.99', () => {
    // 1:1 Transformer: L1 = 1 Henry, L2 = 1 Henry
    // Input AC voltage source = 10V RMS (10V amplitude)
    const vs = new VoltageSourceElement(0, 0, 0, 10, 10.0);
    vs.waveform = 'AC';

    const ind1 = new InductorElement(0, 10, 10, 10, 1.0);
    ind1.seriesResistance = 0.01; // low series resistance

    // Load resistor connected to output of Inductor 2
    const ind2 = new InductorElement(10, 20, 20, 20, 1.0);
    ind2.seriesResistance = 0.01;

    const rLoad = new ResistorElement(20, 20, 30, 20, 1000.0); // 1k load

    const mc = new MutualCouplingElement(0, 0, 10, 0);
    mc.ind1Id = ind1.id;
    mc.ind2Id = ind2.id;
    mc.couplingCoefficient = 0.99; // Strong coupling

    const gnd1 = new GroundElement(0, 0);      // source ground
    const gnd1b = new GroundElement(10, 10);   // primary inductor ground
    const gnd2a = new GroundElement(10, 20);   // secondary inductor ground
    const gnd2b = new GroundElement(30, 20);   // load ground

    circuit.addElement(vs);
    circuit.addElement(ind1);
    circuit.addElement(ind2);
    circuit.addElement(rLoad);
    circuit.addElement(mc);
    circuit.addElement(gnd1);
    circuit.addElement(gnd1b);
    circuit.addElement(gnd2a);
    circuit.addElement(gnd2b);

    circuit.analyzeCircuit();

    // Run sweep at high frequency (1 kHz) where inductive impedance is much larger than series resistance
    const points = ACSweepEngine.runSweep(circuit, 1000, 1000, 1);
    expect(points.length).toBeGreaterThan(0);

    const pt = points[0];
    
    // Output voltage across rLoad
    // For 1:1 transformer with high coupling, Vout should be close to Vin * k = 10 * 0.99 = 9.9V
    const outNodeIdx = ind2.getNode(1);
    const vOutNode = pt.voltages[outNodeIdx];
    const vOutMag = Math.hypot(vOutNode.vReal, vOutNode.vImag);
    
    expect(vOutMag).toBeGreaterThan(9.0);
    expect(vOutMag).toBeLessThan(10.05);
  });
});
