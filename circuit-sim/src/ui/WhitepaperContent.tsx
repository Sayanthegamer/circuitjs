import React from 'react';
import { useCircuitStore } from '../stores/circuitStore';
import { SolverMatrixSystem } from './MatrixInspector';
import ConvergenceSparkline from './ConvergenceSparkline';

interface WhitepaperContentProps {
  canvasContainer: React.ReactNode;
}

export const WhitepaperContent: React.FC<WhitepaperContentProps> = ({ canvasContainer }) => {
  const matrixG = useCircuitStore((s) => s.matrixG);
  const vectorV = useCircuitStore((s) => s.vectorV);
  const vectorI = useCircuitStore((s) => s.vectorI);
  const nrErrors = useCircuitStore((s) => s.nrErrors);

  return (
    <div className="max-w-[1000px] mx-auto px-8 md:px-12 py-16 text-left">
      {/* Section 1: Introduction */}
      <section id="intro" className="mb-16 scroll-mt-20">
        <header className="mb-8">
          <div className="text-accent font-mono text-[10px] mb-3 uppercase tracking-[0.3em]">
            Documentation / 1.0 Overview
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">
            Precision Schematic Simulator
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
            Welcome to the CircuitSim interactive schematic whitepaper. This document functions as both a technical
            report and an active engineering workstation. The schematic figure embedded below operates in real-time
            using a direct transient solver.
          </p>
        </header>
      </section>

      {/* Section 2: Simulation Loop */}
      <section id="sim-loop" className="mb-16 scroll-mt-20">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">2.0</span>
            Transient Analysis & Companion Models
          </h2>
          <p className="text-text-secondary mb-6 leading-relaxed">
            For transient analysis, time-varying components (such as capacitors and inductors) are discretized using
            numerical integration methods. The standard engine uses the **Trapezoidal Rule** to map differential
            equations into algebraic equivalents at each timestep <span className="font-mono text-accent">dt</span>.
          </p>

          <div className="bg-surface-bright/20 border border-border-hairline rounded-sm p-5 font-mono text-xs mb-8 overflow-x-auto relative">
            <div className="absolute top-0 right-0 p-2 text-[8px] text-text-muted uppercase font-bold tracking-widest opacity-40">
              transient_kernel.ts
            </div>
            <pre className="text-text-secondary leading-relaxed">
              <code>{`export function stepTransient(sim: SimulationState, dt: number): void {
  // Discretize and stamp reactive companion models
  sim.components.forEach(c => {
    if (c.isReactive) {
      c.stampCompanionModel(sim.matrix, dt, sim.previousVoltages);
    }
  });
}`}</code>
            </pre>
          </div>
        </article>
      </section>

      {/* Section 3: Matrix Math / solver */}
      <section id="matrix-math" className="mb-16 scroll-mt-20">
        <header className="mb-6">
          <div className="text-accent font-mono text-[10px] mb-3 uppercase tracking-[0.3em]">
            Documentation / 3.0 Solver Matrices
          </div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">3.0</span>
            Modified Nodal Analysis & Newton-Raphson
          </h2>
          <p className="text-text-secondary leading-relaxed">
            The core engine formulates circuit equations via **Modified Nodal Analysis (MNA)**. This approach produces a
            system of equations in the form:
          </p>
          <div className="my-4 pl-4 border-l-2 border-primary/40 font-mono text-text-primary text-sm">
            [G] · [v] = [i]
          </div>
          <p className="text-text-secondary leading-relaxed">
            Where <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[G]</span> is the conductance matrix, <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[v]</span> is the node voltage vector, and <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[i]</span> is the source vector.
          </p>
          <p className="text-text-secondary mt-4 leading-relaxed">
            For circuits containing non-linear elements (like diodes), the solver iteratively linearizes each component
            around its operating point using the **Newton-Raphson method**, converging until the voltage step size falls
            below <span className="font-mono text-accent">1e-6</span>.
          </p>
        </header>

        {/* Interactive Telemetry Diagnostics Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SolverMatrixSystem G={matrixG} v={vectorV} i={vectorI} />
          <ConvergenceSparkline errors={nrErrors} />
        </div>

        {/* Active Schematic Canvas Figure */}
        <div className="flex flex-col gap-1.5 mb-8">
          <div className="flex justify-between items-end">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
              Figure 3.1: Active schematic & live solver environment
            </span>
            <div className="flex gap-2">
              <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-instrument-voltage/10 text-instrument-voltage border border-instrument-voltage/20 uppercase animate-pulse">
                Live Feed
              </span>
            </div>
          </div>

          {canvasContainer}
        </div>
      </section>

      {/* Section 4: Component Reference */}
      <section id="comp-ref" className="mb-16 scroll-mt-20">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">4.0</span>
            Component Reference & Equations
          </h2>
          <p className="text-text-secondary mb-6 leading-relaxed">
            Every circuit component translates to specific mathematical equations within the solver loop:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text-secondary">
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Resistor</div>
              <div>Ohm's Law: V = I · R</div>
              <div className="mt-1 opacity-70">Stamps 1/R into diagonal coefficients of [G]</div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Diode / LED</div>
              <div>Shockley equation: I = I_s · (e^(V_d / (n·V_t)) - 1)</div>
              <div className="mt-1 opacity-70">
                Stamps dynamic conductance G_eq and current source I_eq during NR iterations
              </div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Capacitor</div>
              <div>I = C · dV/dt (Trapezoidal integration)</div>
              <div className="mt-1 opacity-70">Companion model: G_eq = 2C/dt, parallel current source</div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Inductor</div>
              <div>V = L · dI/dt (Trapezoidal integration)</div>
              <div className="mt-1 opacity-70">Companion model: R_eq = 2L/dt, series voltage source</div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default WhitepaperContent;
