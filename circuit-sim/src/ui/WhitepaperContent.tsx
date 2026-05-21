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

          <div className="bg-surface-bright/20 border border-border-hairline rounded p-5 font-mono text-[11px] leading-normal text-text-secondary mb-6 overflow-x-auto">
            <pre>{`               +-------------------------------------------+
               |   Topological Phase: Merge Wire Nodes     |
               +-------------------------------------------+
                                     |
                                     v
               +-------------------------------------------+
               |    Establish Ground & Build Node List     |
               +-------------------------------------------+
                                     |
                                     v
               +-------------------------------------------+
               |   Spanning Forest Build (dfsForest)       |
               +-------------------------------------------+
                                     |
                                     v
             +===============================================+
             |    SIMULATION STEP LOOP (timestep dt)         |
             +===============================================+
             |                                               |
             |   1. Initialize Element Voltages              |
             |                                               |
             |   2. Newton-Raphson Iteration Loop (NR):      |
             |      a. Stamp Linear/Reactive Companions      |
             |      b. Stamp Nonlinear Diodes/LEDs           |
             |      c. Factor & Solve [G] * [v] = [i]        |
             |      d. Check Convergence: Delta V < 1e-6     |
             |         - If converged, break.                |
             |         - If not, repeat NR (max 5000).       |
             |                                               |
             |   3. Advance Time: t = t + dt                 |
             |   4. Switch Integration: Backward Euler -> Trap|
             |   5. Bottom-Up Wire Spanning Forest Summation |
             |      to calculate Wire Currents.              |
             |                                               |
             +===============================================+`}</pre>
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
          <div className="my-6 pl-4 border-l-2 border-primary/40 font-mono text-text-primary text-sm bg-surface/30 py-2">
            [G] · [v] = [i]
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Where <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[G]</span> is the conductance matrix (size N x N, where N is the number of nodes + number of voltage sources), <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[v]</span> is the unknown vector containing node voltages and voltage source branch currents, and <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[i]</span> is the source vector containing independent currents and voltage source values.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            Component contributions are stamped directly into the matrix system:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-text-secondary mb-8">
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Resistor (R)</div>
              <div className="mb-2">Conductance: G = 1/R</div>
              <div className="opacity-70 text-[10px] space-y-1">
                <div>G[n1, n1] += G</div>
                <div>G[n2, n2] += G</div>
                <div>G[n1, n2] -= G</div>
                <div>G[n2, n1] -= G</div>
              </div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Voltage Source (V)</div>
              <div className="mb-2">Adds branch current variable (vs)</div>
              <div className="opacity-70 text-[10px] space-y-1">
                <div>G[vs, n1] = -1; G[vs, n2] = 1</div>
                <div>G[n1, vs] = 1; G[n2, vs] = -1</div>
                <div>i[vs] = V</div>
              </div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Current Source (I)</div>
              <div className="mb-2">Stamps current directly</div>
              <div className="opacity-70 text-[10px] space-y-1">
                <div>i[n1] -= I</div>
                <div>i[n2] += I</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text-secondary mb-6">
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Capacitor Companion (Trapezoidal)</div>
              <div>Equivalent Resistance: R_eq = dt / (2 * C)</div>
              <div>Current Source: I_eq = V_prev / R_eq + I_prev</div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Inductor Companion (Trapezoidal)</div>
              <div>Equivalent Resistance: R_eq = 2 * L / dt</div>
              <div>Current Source: I_eq = V_prev / R_eq + I_prev</div>
            </div>
          </div>

          <h3 className="text-base font-medium text-text-primary mt-6 mb-2">Backward Euler Integration (First-Order Accuracy)</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Backward Euler is an implicit method that evaluates derivatives at the end of the timestep. It introduces 
            heavy artificial high-frequency damping (L-stability), which rapidly suppresses numerical oscillations and ringing 
            caused by sharp discontinuities (such as opening/closing switches).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text-secondary mb-6">
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Capacitor Companion (Backward Euler)</div>
              <div>Equivalent Resistance: R_eq = dt / C</div>
              <div>Current Source: I_eq = V_prev / R_eq</div>
            </div>
            <div className="p-4 border border-border-hairline bg-surface/30">
              <div className="text-text-primary font-bold mb-1">Inductor Companion (Backward Euler)</div>
              <div>Equivalent Resistance: R_eq = L / dt</div>
              <div>Current Source: I_eq = I_prev</div>
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
          <div className="my-4 pl-4 border-l-2 border-primary/40 font-mono text-text-primary text-sm bg-surface/30 py-2">
            I_d = I_s * (exp(V_d / (eta * V_t)) - 1)
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            At each simulation timestep, the solver linearizes the diode curve around its current operating voltage V_0. 
            Using a Taylor series expansion truncated to the first derivative:
          </p>
          <div className="my-4 pl-4 border-l-2 border-primary/40 font-mono text-text-primary text-sm bg-surface/30 py-2">
            I_d ≈ I(V_0) + G_eq * (V_d - V_0) =&gt; I_d = G_eq * V_d + I_eq
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            This linear approximation is stamped into the MNA matrix as:
          </p>
          <ul className="list-disc pl-5 text-text-secondary text-sm space-y-2 mb-6">
            <li>
              <strong>Equivalent Dynamic Conductance:</strong> G_eq = (d I_d / d V_d) at V_0 = (I_s / (eta * V_t)) * exp(V_0 / (eta * V_t)), stamped into the [G] matrix.
            </li>
            <li>
              <strong>Equivalent Companion Current Source:</strong> I_eq = I(V_0) - G_eq * V_0, stamped into the [i] source vector.
            </li>
          </ul>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            The solver iteratively factors the matrix and updates the voltages. The sub-iterations continue until the maximum change 
            in node voltages drops below the convergence threshold: max_j |V_j - V_j_prev| &lt; 10^-6 V.
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
        </article>
      </section>

      {/* Section 7: Spatial Indexing */}
      <section id="spatial-index" className="scroll-mt-20 border-t border-border-hairline pt-12">
        <article className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
            <span className="text-accent text-sm font-mono">7.0</span>
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
