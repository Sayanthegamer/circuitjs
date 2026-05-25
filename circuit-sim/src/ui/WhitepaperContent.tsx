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
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-12 text-left space-y-16">
      {/* Section 1: Introduction */}
      <section id="intro" className="scroll-mt-20">
        <header className="mb-6">
          <div className="text-accent font-mono text-[10px] mb-2 uppercase tracking-[0.3em]">
            Documentation / 1.0 Pipeline
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">
            CircuitSim Engineering Whitepaper
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-3xl">
            This document outlines the mathematical framework, graph topology algorithms, numerical integration 
            methods, and performance optimizations underpinning the <strong>CircuitSim Engine</strong>. 
            The interactive workbench below executes the transient solver directly inside your browser.
          </p>
        </header>

        <article className="prose prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">1.1</span>
            The Simulation Loop Pipeline
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            CircuitSim converts a schematic graph of nodes and branches into a sequence of linear systems solved at each time increment. 
            The full execution pipeline is illustrated in the diagram below:
          </p>

          <div className="space-y-4 max-w-xl mx-auto my-8">
            {/* Step 1 */}
            <div className="relative group p-4 bg-surface/40 border border-border-hairline hover:border-primary/40 transition-colors duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
              <div className="pl-3">
                <span className="text-[9px] font-mono text-accent uppercase tracking-widest block mb-1">Phase 01 / Topological</span>
                <h4 className="text-xs font-bold text-text-primary tracking-tight font-sans">Merge Wire Nodes (Wire Closure)</h4>
                <p className="text-[11px] text-text-secondary mt-1">
                  Combines wire junctions into equivalence classes, reducing matrix dimensions and preventing division-by-zero errors.
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-1 text-accent animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>

            {/* Step 2 */}
            <div className="relative group p-4 bg-surface/40 border border-border-hairline hover:border-primary/40 transition-colors duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
              <div className="pl-3">
                <span className="text-[9px] font-mono text-accent uppercase tracking-widest block mb-1">Phase 02 / Reference</span>
                <h4 className="text-xs font-bold text-text-primary tracking-tight font-sans">Establish Ground & Build Node List</h4>
                <p className="text-[11px] text-text-secondary mt-1">
                  Identifies node 0 (ground reference) and numbers remaining independent nodes and internal nodes.
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-1 text-accent animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>

            {/* Step 3 */}
            <div className="relative group p-4 bg-surface/40 border border-border-hairline hover:border-primary/40 transition-colors duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
              <div className="pl-3">
                <span className="text-[9px] font-mono text-accent uppercase tracking-widest block mb-1">Phase 03 / Tree Traverse</span>
                <h4 className="text-xs font-bold text-text-primary tracking-tight font-sans">Spanning Forest Build (dfsForest)</h4>
                <p className="text-[11px] text-text-secondary mt-1">
                  Builds a depth-first search tree for wire subgraphs, marking loops (chord edges) to solve wire branch currents.
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-1 text-accent animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>

            {/* Step 4: Loop Block */}
            <div className="p-5 border border-dashed border-primary/30 bg-primary/5 relative">
              <div className="absolute -top-3 left-4 bg-[#0c0c12] px-2 text-[9px] font-mono font-bold text-primary uppercase tracking-widest border border-primary/30">
                Simulation Loop (Every Timestep dt)
              </div>
              
              <div className="space-y-4 mt-2">
                {/* Loop Step 1 */}
                <div className="p-3 bg-surface/60 border border-border-hairline">
                  <h5 className="text-[11px] font-bold text-text-primary font-mono">1. Initialize Element Voltages</h5>
                </div>
                {/* Loop Step 2 */}
                <div className="p-3 bg-surface/60 border border-border-hairline relative">
                  <h5 className="text-[11px] font-bold text-text-primary font-mono">2. Newton-Raphson Loop (NR)</h5>
                  <ul className="list-disc pl-4 text-[10px] text-text-secondary mt-1.5 space-y-1">
                    <li>Stamp Linear/Reactive Companions</li>
                    <li>Stamp Nonlinear Diodes/LEDs/BJTs</li>
                    <li>Factor & Solve <code className="text-primary font-bold">[G] · [v] = [i]</code></li>
                    <li>Check Convergence: <code className="text-accent">&Delta;V &lt; 1e-6</code></li>
                  </ul>
                </div>
                {/* Loop Step 3 */}
                <div className="p-3 bg-surface/60 border border-border-hairline">
                  <h5 className="text-[11px] font-bold text-text-primary font-mono">3. Advance Time: <code className="text-accent">t = t + dt</code></h5>
                </div>
                {/* Loop Step 4 */}
                <div className="p-3 bg-surface/60 border border-border-hairline">
                  <h5 className="text-[11px] font-bold text-text-primary font-mono">4. Compute Wire Currents via Forest Summation</h5>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Section 2: Graph Topology */}
      <section id="graph-topology" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">2.0</span>
            Topological Graph Analysis & Wires
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Ideal wires represent perfect short circuits (R = 0 ohms). In a naive matrix solver, stamping 
            a resistor of 0 ohms is impossible as conductance G = 1/R approaches infinity, causing division-by-zero. 
            Modeling wires using extremely small resistances leads to ill-conditioned matrices that produce numerical instability. 
            Alternatively, adding a voltage source of 0 V for each wire increases the matrix size, degrading performance.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            To circumvent this, CircuitSim utilizes a two-phase topological graph solver:
          </p>
          <ol className="list-decimal pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Node Merging (Wire Closure):</strong> Before building the matrix, the engine scans all wires 
              and merges connected junctions into equivalence classes. Points connected by wires map to the exact same 
              electrical node, eliminating wires from the solver's conductance matrix and reducing overall matrix size.
            </li>
            <li>
              <strong>DFS Spanning Forest:</strong> Because wires are eliminated from the main system, their individual 
              branch currents are not solved by the matrix. To calculate these post-solve, CircuitSim builds a 
              forest of trees representing the connected wire subgraphs. During topological analysis, the engine runs 
              a Depth-First Search (DFS) on each wire network. Edges that form the spanning tree are marked, while 
              loop-closing wires are marked as chord edges.
            </li>
          </ol>

          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            Once node voltages are solved, a bottom-up, post-order traversal of the spanning forest determines wire branch currents 
            by accumulating the current entering nodes from non-wire components:
          </p>

          <div className="bg-surface-bright/20 border border-border-hairline rounded-sm p-5 font-mono text-xs mb-8 overflow-x-auto relative">
            <div className="absolute top-0 right-0 p-2 text-[8px] text-text-muted uppercase font-bold tracking-widest opacity-40">
              circuit.ts
            </div>
            <pre className="text-text-secondary leading-relaxed">
              <code>{`// Post-order traversal to compute currents from leaves up to roots
for (const node of postOrderList) {
  let totalCurrent = 0;
  
  // Sum current entering node from active components (resistors, diodes, sources)
  for (const contributor of nodeData.nonWireContributors) {
    totalCurrent += contributor.element.getCurrentIntoNode(contributor.post);
  }
  
  // Sum currents from child subtrees in the spanning forest
  for (const child of node.children) {
    totalCurrent += nodeCurrents.get(child) || 0;
  }
  
  nodeCurrents.set(node, totalCurrent);

  // Propagate to parent edge wire
  if (node.edgeToParent) {
    node.edgeToParent.wire.current = node.edgeToParent.isForward 
      ? -totalCurrent 
      : totalCurrent;
  }
}`}</code>
            </pre>
          </div>
        </article>
      </section>

      {/* Section 3: MNA */}
      <section id="matrix-math" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <header className="mb-6">
          <div className="text-accent font-mono text-[10px] mb-2 uppercase tracking-[0.3em]">
            Documentation / 3.0 Solver Matrices
          </div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">3.0</span>
            Modified Nodal Analysis (MNA)
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            The core engine solves the node voltages using <strong>Modified Nodal Analysis (MNA)</strong>. 
            MNA structures the circuit equations into a matrix equation:
          </p>
          <div className="my-6 flex justify-center py-5 bg-surface/30 border-y border-border-hairline font-serif text-lg tracking-wide text-text-primary select-none gap-3 items-center">
            <span className="font-bold font-sans px-1.5 py-0.5 border border-primary/30 bg-primary/10 rounded text-[10px] tracking-widest text-primary uppercase">MNA System</span>
            <span className="font-mono font-bold">[G]</span> &middot; <span className="font-mono font-bold">[v]</span> = <span className="font-mono font-bold">[i]</span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Where <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[G]</span> is the conductance matrix (dimension <var className="italic">N</var> &times; <var className="italic">N</var>, where <var className="italic">N</var> is the number of electrical nodes + number of independent voltage sources), <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[v]</span> is the node voltage and branch current vector, and <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[i]</span> is the injected source current and terminal voltage vector.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            Component contributions are stamped directly into the matrix system:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-text-secondary mb-8">
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1 font-sans text-sm">Resistor (<var className="italic">R</var>)</div>
              <div className="mb-2 text-text-secondary text-[11px]">Conductance: <var className="italic">G</var> = 1 / <var className="italic">R</var></div>
              <div className="opacity-80 text-[10px] space-y-1">
                <div>G[n<sub>1</sub>, n<sub>1</sub>] &nbsp;+= <var className="italic">G</var></div>
                <div>G[n<sub>2</sub>, n<sub>2</sub>] &nbsp;+= <var className="italic">G</var></div>
                <div>G[n<sub>1</sub>, n<sub>2</sub>] &nbsp;&minus;= <var className="italic">G</var></div>
                <div>G[n<sub>2</sub>, n<sub>1</sub>] &nbsp;&minus;= <var className="italic">G</var></div>
              </div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1 font-sans text-sm">Voltage Source (<var className="italic">V</var>)</div>
              <div className="mb-2 text-text-secondary text-[11px]">Adds branch current variable (<var className="italic">vs</var>)</div>
              <div className="opacity-80 text-[10px] space-y-1">
                <div>G[<var className="italic">vs</var>, n<sub>1</sub>] &nbsp;= &minus;1</div>
                <div>G[<var className="italic">vs</var>, n<sub>2</sub>] &nbsp;= 1</div>
                <div>G[n<sub>1</sub>, <var className="italic">vs</var>] &nbsp;= 1</div>
                <div>G[n<sub>2</sub>, <var className="italic">vs</var>] &nbsp;= &minus;1</div>
                <div>i[<var className="italic">vs</var>] &nbsp;= <var className="italic">V</var></div>
              </div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1 font-sans text-sm">Current Source (<var className="italic">I</var>)</div>
              <div className="mb-2 text-text-secondary text-[11px]">Stamps current directly</div>
              <div className="opacity-80 text-[10px] space-y-1">
                <div>i[n<sub>1</sub>] &nbsp;&minus;= <var className="italic">I</var></div>
                <div>i[n<sub>2</sub>] &nbsp;+= <var className="italic">I</var></div>
              </div>
            </div>
          </div>
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

      {/* Section 4: Numerical Integration */}
      <section id="integration" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">4.0</span>
            Numerical Integration & Reactive Companions
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Capacitors (I = C * dV/dt) and Inductors (V = L * dI/dt) are governed by differential equations. 
            To solve them at discrete time intervals dt, they are approximated using numerical integration algorithms 
            and stamped into the matrix as resistive companion models (an equivalent resistor in parallel with a current source).
          </p>

          <h3 className="text-base font-medium text-text-primary mt-6 mb-2">Trapezoidal Rule (Second-Order Accuracy)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            The Trapezoidal rule computes the integration as the average of the derivatives at the beginning and end of the timestep. 
            It is energy-conserving and exhibits zero artificial numerical dissipation, making it perfect for resonant structures (like LC oscillators). 
            However, it is susceptible to "trapezoidal ringing" (high-frequency numerical oscillation) when subjected to steep inputs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-secondary mb-6 font-sans">
            <div className="p-4 border border-border-hairline bg-surface/30 space-y-2">
              <div className="text-text-primary font-bold text-sm">Capacitor Companion (Trapezoidal)</div>
              <div className="text-[11px] leading-relaxed">Equivalent Resistance: <var className="italic">R<sub>eq</sub></var> = <span className="font-serif">dt / ( 2 &middot; <var className="italic">C</var> )</span></div>
              <div className="text-[11px] leading-relaxed font-serif">Companion Current: <var className="italic">I<sub>eq</sub></var> = <var className="italic">V<sub>prev</sub></var> / <var className="italic">R<sub>eq</sub></var> + <var className="italic">I<sub>prev</sub></var></div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30 space-y-2">
              <div className="text-text-primary font-bold text-sm">Inductor Companion (Trapezoidal)</div>
              <div className="text-[11px] leading-relaxed">Equivalent Resistance: <var className="italic">R<sub>eq</sub></var> = <span className="font-serif">2 &middot; <var className="italic">L</var> / dt</span></div>
              <div className="text-[11px] leading-relaxed font-serif">Companion Current: <var className="italic">I<sub>eq</sub></var> = <var className="italic">V<sub>prev</sub></var> / <var className="italic">R<sub>eq</sub></var> + <var className="italic">I<sub>prev</sub></var></div>
            </div>
          </div>

          <h3 className="text-base font-medium text-text-primary mt-6 mb-2">Backward Euler Integration (First-Order Accuracy)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Backward Euler is an implicit method that evaluates derivatives at the end of the timestep. It introduces 
            heavy artificial high-frequency damping (L-stability), which rapidly suppresses numerical oscillations and ringing 
            caused by sharp discontinuities (such as opening/closing switches).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-secondary mb-6 font-sans">
            <div className="p-4 border border-border-hairline bg-surface/30 space-y-2">
              <div className="text-text-primary font-bold text-sm">Capacitor Companion (Backward Euler)</div>
              <div className="text-[11px] leading-relaxed">Equivalent Resistance: <var className="italic">R<sub>eq</sub></var> = <span className="font-serif">dt / <var className="italic">C</var></span></div>
              <div className="text-[11px] leading-relaxed font-serif">Companion Current: <var className="italic">I<sub>eq</sub></var> = <var className="italic">V<sub>prev</sub></var> / <var className="italic">R<sub>eq</sub></var></div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30 space-y-2">
              <div className="text-text-primary font-bold text-sm">Inductor Companion (Backward Euler)</div>
              <div className="text-[11px] leading-relaxed">Equivalent Resistance: <var className="italic">R<sub>eq</sub></var> = <span className="font-serif"><var className="italic">L</var> / dt</span></div>
              <div className="text-[11px] leading-relaxed font-serif">Companion Current: <var className="italic">I<sub>eq</sub></var> = <var className="italic">I<sub>prev</sub></var></div>
            </div>
          </div>

          <h3 className="text-base font-medium text-text-primary mt-6 mb-2">Dynamic Integration Method Selection</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            CircuitSim combines the strengths of both algorithms:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Initial/Discontinuity Steps:</strong> The simulator initiates in <strong>Backward Euler</strong> mode on the very 
              first step (and during topological transitions) to damp out initial condition transients and prevent startup pops.
            </li>
            <li>
              <strong>Subsequent Steps:</strong> Once the transient spike settles, the engine transitions to <strong>Trapezoidal</strong> integration 
              to provide high-fidelity, undamped AC and oscillatory waveforms.
            </li>
          </ul>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">4.3 Constraint-Based Ideal Transformer (Class 12 Syllabus)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            For electromagnetic induction and transformer turns ratio ( <var className="italic">N<sub>s</sub></var> / <var className="italic">N<sub>p</sub></var> = <var className="italic">V<sub>s</sub></var> / <var className="italic">V<sub>p</sub></var> = <var className="italic">I<sub>p</sub></var> / <var className="italic">I<sub>s</sub></var> ) studies in CBSE/JEE physics, 
            modelling magnetic leakage inductances and mutual couplings (k &asymp; 1) often introduces numerical blowups. 
            To prevent this, CircuitSim utilizes a **constrained ideal transformer model** stamped directly into the MNA solver:
          </p>
          <div className="my-6 flex justify-center items-center py-5 bg-surface/30 border-y border-border-hairline font-serif text-base text-text-primary gap-4">
            <span className="font-bold font-sans px-1.5 py-0.5 border border-primary/30 bg-primary/10 rounded text-[10px] tracking-widest text-primary uppercase">Ideal Transformer</span>
            <div>
              <var className="italic">V<sub>s</sub></var> &minus; <var className="italic">N</var>&middot;<var className="italic">V<sub>p</sub></var> &minus; <var className="italic">I<sub>vs</sub></var>&middot;( <var className="italic">R<sub>s2</sub></var> + <var className="italic">N</var><sup>2</sup> &middot; <var className="italic">R<sub>s1</sub></var> ) = 0
            </div>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            By introducing an extra variable for the secondary winding current (I_vs), the system enforces the voltage ratio constraint directly, 
            whilst integrating winding resistances Rs1 and Rs2 to prevent singularities. This model operates with **zero reactive transient steps**, 
            meaning it requires no differential equation calculations and runs with perfect accuracy and stability at any timestep.
          </p>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">4.4 Solver Breakpoint Manager & Pulse Waveforms</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Simulating sharp transitions (e.g., square waves or pulsed signals) using a fixed time step can lead to significant overshoot errors and numerical oscillation. If a source switches states between steps, the solver misses the exact switching instant, introducing artificial energy errors.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            To solve this, CircuitSim incorporates a **Solver Breakpoint Manager**. When a voltage source generates a non-sinusoidal waveform (Square, Triangle, Pulse), it registers its upcoming switching times (breakpoints) into a central queue. The transient solver checks this queue at each step. If a breakpoint falls within the next step interval, the solver dynamically shrinks the timestep to land exactly on the breakpoint, resets to Backward Euler to damp out high-frequency ringing, and then restores the default timestep.
          </p>
        </article>
      </section>

      {/* Section 5: Newton-Raphson */}
      <section id="newton-raphson" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">5.0</span>
            Newton-Raphson Nonlinear Solver
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            For non-linear components (such as diodes and LEDs), the voltage-current relationship is governed by exponential equations, 
            meaning the circuit cannot be solved in a single matrix operation. CircuitSim resolves this using the 
            <strong>Newton-Raphson iteration algorithm</strong>.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            A diode is modeled using the Shockley diode equation:
          </p>
          <div className="my-6 flex justify-center items-center py-5 bg-surface/30 border-y border-border-hairline font-serif text-base text-text-primary gap-4">
            <span className="font-bold font-sans px-1.5 py-0.5 border border-primary/30 bg-primary/10 rounded text-[10px] tracking-widest text-primary uppercase">Shockley Curve</span>
            <div>
              <var className="italic">I<sub>d</sub></var> = <var className="italic">I<sub>s</sub></var> &middot; ( e<sup><var className="italic">V<sub>d</sub></var> / (&eta; &middot; <var className="italic">V<sub>t</sub></var>)</sup> &minus; 1 )
            </div>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            At each simulation timestep, the solver linearizes the diode curve around its current operating voltage V_0. 
            Using a Taylor series expansion truncated to the first derivative:
          </p>
          <div className="my-6 flex justify-center items-center py-5 bg-surface/30 border-y border-border-hairline font-serif text-base text-text-primary gap-4">
            <span className="font-bold font-sans px-1.5 py-0.5 border border-primary/30 bg-primary/10 rounded text-[10px] tracking-widest text-primary uppercase">Linearized Taylor Series</span>
            <div>
              <var className="italic">I<sub>d</sub></var> &asymp; <var className="italic">I</var>(<var className="italic">V</var><sub>0</sub>) + <var className="italic">G<sub>eq</sub></var> &middot; ( <var className="italic">V<sub>d</sub></var> &minus; <var className="italic">V</var><sub>0</sub> ) &rArr; <var className="italic">I<sub>d</sub></var> = <var className="italic">G<sub>eq</sub></var> &middot; <var className="italic">V<sub>d</sub></var> + <var className="italic">I<sub>eq</sub></var>
            </div>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            This linear approximation is stamped into the MNA matrix as:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Equivalent Dynamic Conductance:</strong> <var className="italic">G<sub>eq</sub></var> = ( d<var className="italic">I<sub>d</sub></var> / d<var className="italic">V<sub>d</sub></var> ) |<sub>V<sub>0</sub></sub> = ( <var className="italic">I<sub>s</sub></var> / (&eta;&middot;<var className="italic">V<sub>t</sub></var>) ) &middot; e<sup><var className="italic">V<sub>0</sub></var> / (&eta;&middot;<var className="italic">V<sub>t</sub></var>)</sup>, stamped into the [G] matrix.
            </li>
            <li>
              <strong>Equivalent Companion Current Source:</strong> <var className="italic">I<sub>eq</sub></var> = <var className="italic">I</var>(<var className="italic">V<sub>0</sub></var>) &minus; <var className="italic">G<sub>eq</sub></var>&middot;<var className="italic">V<sub>0</sub></var>, stamped into the [i] source vector.
            </li>
          </ul>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            The solver iteratively factors the matrix and updates the voltages. The sub-iterations continue until the maximum change 
            in node voltages drops below the convergence threshold: <var className="italic">max<sub>j</sub></var> | <var className="italic">V<sub>j</sub></var> &minus; <var className="italic">V<sub>j,prev</sub></var> | &lt; 10<sup>&minus;6</sup> V.
          </p>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">5.1 Piecewise Linear (PWL) Diode (Syllabus & Performance Optimization)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            The standard exponential Shockley equation is highly unstable when simulated with high voltage or frequency AC inputs, 
            resulting in convergence failures and heavy CPU load. In the CBSE/JEE syllabus, diodes are simplified to their piecewise linear (PWL) behaviors:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li><strong>OFF State (Vd &lt; Vf):</strong> Modelled as a very large resistance (Gmin = 1e-9 S), current source I = 0 A.</li>
            <li><strong>ON State (Vd &ge; Vf):</strong> Modelled as a small resistance Ron (series resistance Rs) in series with a threshold voltage drop (0.7V for Silicon, 2.0V for LED).</li>
            <li><strong>Zener Breakdown (Vd &le; -Vz):</strong> Modelled as Ron in series with Zener breakdown voltage source.</li>
          </ul>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            By mapping the diode to these discrete linear regions, the simulator checks state convergence (did the diode change state from ON to OFF?). 
            This reduces the required Newton-Raphson sub-iterations from several thousand down to <strong>exactly 1 or 2 steps</strong>, completely avoiding costly 
            exponential calls and allowing complex full-wave rectifiers to run at full speed on very basic student devices.
          </p>

          <div className="relative my-6 p-5 border border-border-hairline bg-amber-500/5 rounded-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="pl-3">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block mb-1">
                Technical Limitation / Numerical State Chattering
              </span>
              <h4 className="text-xs font-bold text-text-primary tracking-tight font-sans mb-1.5">
                Piecewise Discontinuity &amp; Transient Oscillations
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Because the PWL model switches instantaneously between a massive off-resistance (1 GΩ) and a tiny on-resistance (0.1 Ω) at precisely the forward voltage threshold <var className="italic">V<sub>f</sub></var>, the solver can fall into a state-chattering cycle (switching ON ↔ OFF at each sub-iteration). Under fast-switching or high-power conditions, the solver may fail to converge and accept the state at the maximum iteration limit (5,000 steps). This introduces high-frequency numerical artifacts—visible as rapid dips or peaks on oscilloscope graphs.
              </p>
              <p className="text-xs text-text-secondary leading-relaxed mt-2">
                <strong>Mitigation Strategies:</strong>
              </p>
              <ul className="list-disc pl-4 text-xs text-text-secondary mt-1.5 space-y-1">
                <li>
                  <strong>Add a Filtering Capacitor:</strong> Placing a smoothing capacitor in parallel with the load limits high-frequency voltage fluctuations across the diode, allowing the solver to converge cleanly.
                </li>
                <li>
                  <strong>Use Realistic Resistance Values:</strong> Avoid extremely small load resistances (e.g. running multiple amperes of current through an LED). Use a realistic current-limiting resistor (e.g. 1 kΩ) to damp iteration swings.
                </li>
              </ul>
            </div>
          </div>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">5.2 Bipolar Junction Transistor (BJT) Ebers-Moll Model (Syllabus Amplifier)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            The BJT is a core semiconductor component in the Class 12 Boards and JEE Physics syllabus, studied as a common-emitter amplifier. In CircuitSim, BJTs (both NPN and PNP configurations) are modeled using the **Ebers-Moll equations**, which couple the base-emitter and base-collector PN junctions:
          </p>
          <div className="my-6 flex justify-center items-center py-5 bg-surface/30 border-y border-border-hairline font-serif text-base text-text-primary gap-4 flex-wrap">
            <span className="font-bold font-sans px-1.5 py-0.5 border border-primary/30 bg-primary/10 rounded text-[10px] tracking-widest text-primary uppercase">Ebers-Moll Equations</span>
            <div>
              <var className="italic">I<sub>c</sub></var> = &alpha;<sub>f</sub> &middot; <var className="italic">I<sub>es</sub></var> &middot; ( e<sup><var className="italic">V<sub>be</sub></var> / <var className="italic">V<sub>t</sub></var></sup> &minus; 1 ) &minus; <var className="italic">I<sub>cs</sub></var> &middot; ( e<sup><var className="italic">V<sub>bc</sub></var> / <var className="italic">V<sub>t</sub></var></sup> &minus; 1 )
            </div>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Because the exponential terms are extremely steep, naive Newton-Raphson updates can cause the solver to oscillate between huge voltages and fail to converge. To prevent this, the engine implements **junction voltage step-limiting**. If the calculated change in a junction voltage exceeds a thermal limit, it is clamped, ensuring stable convergence in multi-stage transistor amplifiers.
          </p>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">5.3 Event-Driven Logic Gates & Matrix Bypass</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Class 12 Physics syllabus covers basic logic gates (AND, OR, NOT, NAND, NOR) and their truth tables. Rather than modeling logic gates using complex analog transistor networks, CircuitSim treats them as event-driven digital components integrated directly with the analog solver.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            The input voltages are compared against low/high logic thresholds (0.8V and 2.0V). If an input transition is detected, a breakpoint is registered at the switching instant to capture the logic propagation delay. To keep simulation FPS high when logic states are stable, the engine applies a **matrix bypass optimization**: stable logic gates skip the Newton-Raphson iteration loop entirely, injecting constant current/voltage values directly, which reduces matrix size and computational overhead.
          </p>
        </article>
      </section>

      {/* Section 6: GC-Free */}
      <section id="performance" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">6.0</span>
            Real-Time GC-Free Optimizations
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            JavaScript is a garbage-collected language. In standard operations, allocating objects inside a hot loop causes 
            frequent garbage collection sweeps. In a real-time web simulator running at thousands of iterations per second, 
            these micro-pauses manifest as visible viewport stuttering and missed frames.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            To guarantee a rock-solid, jitter-free 60 FPS viewport, the CircuitSim simulation engine operates 
            with a <strong>garbage-collection (GC) free transient loop</strong>:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Pre-allocated Typed Arrays:</strong> In-place Float64Arrays (such as <code>nodeVoltages</code>, 
              <code>prevNodeVoltages</code>, and <code>circuitRightSide</code>) are allocated once during the topology building phase. 
              The solver loop overwrites elements directly in these static memory regions, bypassing heap allocations.
            </li>
            <li>
              <strong>LU Factorization In-Place:</strong> Matrix factorization indices and LU arrays are reused 
              across solver steps to prevent object generation.
            </li>
            <li>
              <strong>Throttled Telemetry Copying:</strong> Copying large matrix configurations to the React UI on every simulation 
              microstep would saturate the main thread. Instead, CircuitSim captures solver state snapshots at a throttled rate 
              of ~4Hz. This keeps the interactive matrix debugger responsive while freeing 99.9% of step cycles from memory copying overhead.
            </li>
          </ul>

          <h3 className="text-base font-medium text-text-primary mt-8 mb-2">6.1 CPU Time Budgeting & Overload Safety Interrupter</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            To prevent student computers from lagging or overheating under heavy simulations (such as high-frequency AC resonance), 
            CircuitSim implements two safety guards in the simulation execution loop:
          </p>
          <ol className="list-decimal pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Time Budgeting (4ms limit):</strong> The simulation loop limits solving time to a maximum of **4ms per animation frame**. 
              If the solving equations take longer than this budget, it yields to the browser rendering loop. This guarantees the viewport remains 
              responsive at a smooth 60 FPS even on low-end Chromebooks.
            </li>
            <li>
              <strong>Overload Safety Interrupter:</strong> If an unstable component configuration leads to infinite currents or voltages 
              exceeding safe classroom limits (V &gt; 1000V or I &gt; 50A), the solver halts automatically with an overload warning 
              message in the status bar, preventing browser crashes.
            </li>
          </ol>
        </article>
      </section>

      {/* Section 7: Multi-Mode Simulation Routines */}
      <section id="analysis-modes" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">7.0</span>
            Multi-Mode Simulation: DC OP & AC Frequency Sweep
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            CircuitSim supports multiple simulation routines to analyze circuits under different conditions:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>DC Operating Point (DC OP) Homotopy:</strong> Before a transient simulation begins, the simulator solves the steady-state DC configuration. For nonlinear circuits, the Newton-Raphson solver can easily fail if started from a zero state. CircuitSim implements **source-stepping homotopy**: a scaling factor (kappa) ramps all independent voltage/current sources from 0 to 100% in steps, using the solution of the previous step as the starting point for the next, guaranteeing convergence.
            </li>
            <li>
              <strong>AC Frequency Sweep:</strong> To analyze filters, resonators, and frequency responses, the AC Sweep engine sweeps the circuit over a range of frequencies. Since AC signals are sinusoidal, the components are stamped using complex impedances: Z_c = 1 / (j * omega * C) and Z_l = j * omega * L. The system constructs a complex matrix of size 2N x 2N representing the real and imaginary equations, solving directly for voltage magnitude and phase at each frequency.
            </li>
          </ul>
        </article>
      </section>

      {/* Section 8: Spatial Grid Indexing */}
      <section id="spatial-index" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">8.0</span>
            Spatial Grid Indexing
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            As mouse cursor moves across the schematic viewport, the system must constantly identify which component 
            is being hovered over. In large circuits, running an O(N) intersection test against every element in the system 
            on every mouse move event drops rendering performance.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            To keep viewport interactions responsive, CircuitSim implements a <strong>2D Spatial Grid Index</strong>:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Grid Partitioning:</strong> The canvas is segmented into cells of size 100 x 100 px.
            </li>
            <li>
              <strong>Index Registration:</strong> Elements are registered in the grid using their physical bounding boxes 
              expanded by a threshold of 20 px to accommodate hover tolerances.
            </li>
            <li>
              <strong>Constant-Time Lookup:</strong> When a mouse move event occurs, the engine directly converts the cursor 
              coordinates to the corresponding cell ID in O(1) time, querying only the subset of elements registered 
              within that cell. This eliminates linear scans and guarantees smooth mouse hover highlights at full screen refresh rates.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
};

export default WhitepaperContent;
