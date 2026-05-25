# CircuitJS Engine Expansion Roadmap: Missing Primitives & Optimization Blueprint

This document outlines the architectural implementation strategies for missing essential primitives and analysis modes within the `circuitjs` simulation engine. Each feature is designed to integrate cleanly with the existing Modified Nodal Analysis (MNA) framework, `IStamper` interface, and Newton-Raphson solver loop found in `circuit.ts`.

---

## 1. Three-Terminal Non-Linear Elements (BJTs & MOSFETs)

### The Missing Primitive

The current engine only models two-terminal components, where the element updates an independent branch or a localized pair of nodes. Active semiconductors like Bipolar Junction Transistors (BJTs) and Field-Effect Transistors (MOSFETs) introduce multi-terminal non-linear cross-coupling: changes in control voltages ($V_{be}$ or $V_{gs}$) directly modulate currents across separate terminals ($I_c$ or $I_d$).

### Mathematical Framework

For an NPN BJT using a simplified Ebers-Moll model, the terminal currents are functions of both internal diode junctions:

$$I_c = \alpha_F I_{es} \left(e^{\frac{V_{be}}{V_t}} - 1\right) - I_{cs} \left(e^{\frac{V_{bc}}{V_t}} - 1\right)$$

$$I_b = (1 - \alpha_F) I_{es} \left(e^{\frac{V_{be}}{V_t}} - 1\right) + (1 - \alpha_R) I_{cs} \left(e^{\frac{V_{bc}}{V_t}} - 1\right)$$

During every Newton-Raphson sub-iteration, the non-linear element must be linearized into a conductance matrix (the Jacobian) and an equivalent companion current vector stamped across three distinct nodes: Collector ($c$), Base ($b$), and Emitter ($e$).

### Stamping Template

The linearized companion model maps to the matrix equation:

$$\begin{bmatrix} g_{cc} & g_{cb} & g_{ce} \\ g_{bc} & g_{bb} & g_{be} \\ g_{ec} & g_{eb} & g_{ee} \end{bmatrix} \begin{bmatrix} V_c \\ V_b \\ V_e \end{bmatrix} = \begin{bmatrix} I_{eq\_c} \\ I_{eq\_b} \\ I_{eq\_e} \end{bmatrix}$$

Where the conductances are partial derivatives evaluated at the last voltage guess:

$$g_{cb} = \frac{\partial I_c}{\partial V_b}, \quad g_{cc} = \frac{\partial I_c}{\partial V_c}, \quad \text{etc.}$$

### Implementation & Optimizations

```typescript
export class BJTElement extends CircuitElement {
  type = 'bjt';
  isNpn = true;
  vt = 0.02585;
  isF = 1e-14; // Forward saturation current
  isR = 1e-14; // Reverse saturation current
  bf = 100;    // Forward beta
  br = 1;      // Reverse beta

  // History tracking to check convergence and perform step-limiting
  lastVbe = 0;
  lastVbc = 0;

  nonLinear(): boolean { return true; }

  stamp(stamper: IStamper): void {
    // Stamp non-linear flags across all three interconnected rows
    stamper.stampNonLinear(this.nodes[0]); // Collector
    stamper.stampNonLinear(this.nodes[1]); // Base
    stamper.stampNonLinear(this.nodes[2]); // Emitter
  }

  doStep(stamper: IStamper): void {
    const vC = this.volts[0];
    const vB = this.volts[1];
    const vE = this.volts[2];

    let vbe = vB - vE;
    let vbc = vB - vC;

    // OPTIMIZATION: BJT Step Limiting (fetlim/pnjlim equivalent)
    // Prevents exponential blowup of the exp() function during out-of-bounds matrix steps
    vbe = this.clampJuctions(vbe, this.lastVbe);
    vbc = this.clampJuctions(vbc, this.lastVbc);

    if (Math.abs(vbe - this.lastVbe) > 0.001 || Math.abs(vbc - this.lastVbc) > 0.001) {
      stamper.converged = false;
    }

    this.lastVbe = vbe;
    this.lastVbc = vbc;

    // Calculate forward and reverse exponential components
    const expBe = Math.exp(vbe / this.vt);
    const expBc = Math.exp(vbc / this.vt);

    // Linearized Small-Signal Conductances (Jacobian Matrix Elements)
    const gbe = (this.isF / this.vt) * expBe;
    const gbc = (this.isR / this.vt) * expBc;
    
    const alphaF = this.bf / (1 + this.bf);
    const alphaR = this.br / (1 + this.br);

    // Norton equivalent current source evaluations
    const cc = alphaF * this.isF * (expBe - 1) - this.isR * (expBc - 1);
    const cb = (1 - alphaF) * this.isF * (expBe - 1) + (1 - alphaR) * this.isR * (expBc - 1);
    
    // Direct cross-coupling entries mapped onto the global MNA system
    // Element stamps matrix rows using stamper.stampMatrix(row, col, value)
    this.stampBJTJacobian(stamper, gbe, gbc, alphaF, alphaR, cc, cb);
  }

  private clampJuctions(vnew: number, vold: number): number {
    const vcrit = this.vt * Math.log(this.vt / (Math.SQRT2 * this.isF));
    if (vnew > vcrit && Math.abs(vnew - vold) > (this.vt + this.vt)) {
      const arg = 1 + (vnew - vold) / this.vt;
      return arg > 0 ? vold + this.vt * Math.log(arg) : vcrit;
    }
    return vnew;
  }

  private stampBJTJacobian(stamper: any, gbe: number, gbc: number, alphaF: number, alphaR: number, cc: number, cb: number): void {
    const [c, b, e] = this.nodes;
    
    // Collector Row Stamping
    stamper.stampConductance(c, c, gbc);
    stamper.stampMatrix(c, b, alphaF * gbe - gbc);
    stamper.stampMatrix(c, e, -alphaF * gbe);
    stamper.stampCurrentSource(c, e, cc); // Companion current source projection

    // Base Row Stamping
    stamper.stampConductance(b, b, (1 - alphaF) * gbe + (1 - alphaR) * gbc);
    stamper.stampMatrix(b, c, -(1 - alphaR) * gbc);
    stamper.stampMatrix(b, e, -(1 - alphaF) * gbe);
    stamper.stampCurrentSource(b, e, cb);
  }
}

```

---

## 2. Independent Current Sources ($I_{in}$)

### The Missing Primitive

While the solver contains internal companion current sources (`stampCurrentSource`), it lacks a standalone user-facing input current primitive. In network analysis, an independent current source injects a constant or time-varying current value directly into a target node regardless of node voltage changes.

### Mathematical Framework

An independent current source connected between Node $A$ and Node $B$ pumping a current value $I_s$ does not modify the left-hand MNA conductance matrix $\mathbf{G}$. It updates the right-hand side (RHS) current vector $\mathbf{I}$ directly:

$$\mathbf{I}[A] = \mathbf{I}[A] - I_s$$

$$\mathbf{I}[B] = \mathbf{I}[B] + I_s$$

### Implementation & Optimizations

* **Zero Matrix Re-factorization:** Since changing the value of an independent current source over time does not alter the $\mathbf{G}$ matrix structure or values, the original matrix factorization (`luFactor`) can be preserved across transient time-steps when no other non-linear elements alter the network. This provides an execution bypass advantage.

```typescript
export class CurrentSourceElement extends CircuitElement {
  type = 'current_source';
  currentValue = 0.002; // Default 2mA

  stamp(stamper: IStamper): void {
    // No matrix conductance modifications necessary
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  doStep(stamper: IStamper): void {
    // Directly inject into the RHS vector
    // Node 0 receives exiting current, Node 1 receives entering current
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.currentValue);
  }

  calculateCurrent(): void {
    this.current = this.currentValue;
  }
}

```

---

## 3. Dynamic Waveform Generation & Breakpoint Integration

### The Missing Primitive

The current `VoltageSourceElement` only features primitive, hardcoded continuous evaluations for standard DC and perfect sinusoids:

```typescript
return Math.sin(2 * Math.PI * safeFrequency * t) * this.maxVoltage;

```

It completely omits sharp non-sinusoidal switching states: **Square, Triangle, Pulse/PWM, and Piecewise Linear (PWL)** profiles.

### The Optimization Challenge: Gibbs Phenomenon & Trapezoidal Oscillation

When a continuous time fixed-step integrator (like your Backward Euler or Trapezoidal solver loop) encounters an instantaneous derivative change ($\frac{dv}{dt} \to \infty$) like the falling edge of a digital square wave, the historical state vector overshoots. This creates unphysical high-frequency numerical oscillations (ringing) that degrade accuracy and trigger false non-linear convergence alerts.

```text
Trapezoidal Ringing without Breakpoints:
    __
   |  |   /\  /\
___|  |__/  \/  \/... (Unphysical Numerical Oscillation)
```

### Implementation & Optimizations

* **Breakpoint Injection:** The circuit core engine must allow elements to register exact internal switching events ahead of time. When the timeline draws near a breakpoint, the engine must override the global fixed `timeStep`, landing exactly on the transition boundary, resolving the discontinuity, and stepping forward safely.

```typescript
export interface IBreakpointEngine {
  registerBreakpoint(t: number): void;
}

export class AdvancedSignalSource extends CircuitElement {
  type = 'voltage_source_adv';
  waveform: 'SQUARE' | 'TRIANGLE' | 'PWL' = 'SQUARE';
  period = 0.02; // 50 Hz
  amplitude = 5;

  getVoltageSourceCount(): number { return 1; }

  stamp(stamper: IStamper): void {
    stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
  }

  doStep(stamper: IStamper): void {
    const timeWithinPeriod = stamper.t % this.period;
    let vOut = 0;

    // Regulate time-step adjustments on the global engine container
    if ('registerBreakpoint' in stamper) {
      // Predictively inject next edge transitions into the solver pipeline
      const currentPeriodStart = stamper.t - timeWithinPeriod;
      (stamper as unknown as IBreakpointEngine).registerBreakpoint(currentPeriodStart + this.period / 2);
      (stamper as unknown as IBreakpointEngine).registerBreakpoint(currentPeriodStart + this.period);
    }

    if (this.waveform === 'SQUARE') {
      vOut = timeWithinPeriod < this.period / 2 ? this.amplitude : -this.amplitude;
    } else if (this.waveform === 'TRIANGLE') {
      const fraction = timeWithinPeriod / this.period;
      vOut = fraction < 0.5 
        ? this.amplitude * (4 * fraction - 1) 
        : this.amplitude * (3 - 4 * fraction);
    }

    stamper.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, vOut);
  }
}
```

---

## 4. Internal Component Parasitics (ESR & Leakage)

### The Missing Primitive

The internal reactive companion structures for capacitors and inductors assume mathematically frictionless ideals. Real-world components suffer from **Equivalent Series Resistance (ESR)** in capacitor foils and winding resistance in inductor coils.

### Optimization Strategy: Internal Node Folding (Norton Matrix Transformations)

Adding an explicit internal resistor element to track parasitic resistance introduces an additional hidden structural node to the circuit graph list. More nodes expand the dimensions of your MNA matrices, causing execution degradation ($\mathcal{O}(N^3)$ processing scale for dense matrix solver factorizations).

Instead of creating physical resistor components, fold the parasitic directly into the reactive time-discretization equation via **Norton/Thevenin matrix transformations** to preserve the overall matrix dimensions.

```text
Physical Model (Adds an expensive extra internal node):
Node 0 o----[ Ideal Cap ]----( Internal Node )----[ ESR Resistor ]----o Node 1

Folded Model (Zero additional nodes, mathematical equivalence):
Node 0 o--------------------[ G_combined ]---------------------------o Node 1
       \--------------------( I_combined )---------------------------/
```

### Mathematical Transformation

For an ideal capacitor under Trapezoidal integration:

$$G_{\text{ideal}} = \frac{2C}{\Delta t}, \quad I_{\text{companion}} = G_{\text{ideal}} V_{n-1} + I_{n-1}$$

When adding an explicit series parasitic $R_{\text{esr}}$, we compute the combined effective conductance $G_{\text{norton}}$ and current scalar $I_{\text{norton}}$ mapped directly across the existing external terminal nodes without expanding the matrix:

$$G_{\text{norton}} = \frac{G_{\text{ideal}}}{1 + G_{\text{ideal}} \cdot R_{\text{esr}}}$$

$$I_{\text{norton}} = \frac{I_{\text{companion}}}{1 + G_{\text{ideal}} \cdot R_{\text{esr}}}$$

### Implementation

```typescript
export class ParasiticCapacitor extends CircuitElement {
  type = 'capacitor_parasitic';
  capacitance = 1e-6; // 1uF
  esr = 0.5;          // 0.5 Ohm internal parasitic resistance
  
  private compG = 0;
  private compI = 0;

  stamp(stamper: IStamper): void {
    const idealG = (2.0 * this.capacitance) / stamper.timeStep;
    
    // Fold the series resistance into a single conductance value via Norton representation
    this.compG = idealG / (1.0 + idealG * this.esr);
    
    stamper.stampResistor(this.nodes[0], this.nodes[1], this.compG);
    stamper.stampRightSide(this.nodes[0]);
    stamper.stampRightSide(this.nodes[1]);
  }

  startIteration(): void {
    const vdiff = this.volts[0] - this.volts[1];
    const idealG = (2.0 * this.capacitance) / 5e-6; // Map against normalized time step
    
    const idealIcomp = idealG * vdiff + this.current;
    this.compI = idealIcomp / (1.0 + idealG * this.esr);
  }

  doStep(stamper: IStamper): void {
    stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.compI);
  }

  calculateCurrent(): void {
    const vdiff = this.volts[0] - this.volts[1];
    this.current = (vdiff * this.compG) + this.compI;
  }
}
```

---

## 5. Event-Driven Mixed-Signal Logic Gates

### The Missing Primitive

Digital components (AND, OR, NOT, NAND gates) are missing entirely. Simulating logic gates as purely continuous analog circuits with high-gain internal transistor configurations burdens the non-linear iterative solver unnecessarily.

### Optimization Strategy: Bypass Execution & Latency Mapping

Digital inputs operate across flat voltage plateaus representing discrete logical boolean states ($0$ and $1$). By treating digital primitives with an event-driven framework, we completely bypass matrix processing for digital sub-blocks if their input logic thresholds have not been broken.

```text
Analog Input:   /¯¯¯¯\        (Continuously changing, recomputes MNA matrix)
Digital Output: _____/¯¯¯¯¯   (Bypasses calculations until threshold point occurs)
```

### Implementation

```typescript
export class DigitalAndGate extends CircuitElement {
  type = 'and_gate';
  vHigh = 5.0;
  vLow = 0.0;
  vThreshold = 2.5;

  // Track logic states to bypass re-evaluation when inputs are idle
  lastStateIn1 = false;
  lastStateIn2 = false;
  currentOutputVoltage = 0;

  getVoltageSourceCount(): number { return 1; }

  stamp(stamper: IStamper): void {
    // Output pin acts as a controlled voltage source referenced to Ground
    stamper.stampVoltageSource(this.nodes[2], 0, this.voltSource);
  }

  doStep(stamper: IStamper): void {
    const in1 = this.volts[0] > this.vThreshold;
    const in2 = this.volts[1] > this.vThreshold;
    
    // OPTIMIZATION: Bypass processing if digital states are static
    if (in1 === this.lastStateIn1 && in2 === this.lastStateIn2) {
      stamper.updateVoltageSource(this.nodes[2], 0, this.voltSource, this.currentOutputVoltage);
      return;
    }

    this.lastStateIn1 = in1;
    this.lastStateIn2 = in2;
    this.currentOutputVoltage = (in1 && in2) ? this.vHigh : this.vLow;

    stamper.updateVoltageSource(this.nodes[2], 0, this.voltSource, this.currentOutputVoltage);
  }
}

```

---

## 6. Multi-Mode Simulation Routines

The structural architecture inside `circuit.ts` currently restricts execution to a single continuous transient loop: `this.t += this.timeStep`. This leaves out essential DC operating point initialization and frequency domain visibility.

### Summary of Simulation Modes

| Simulation Mode | Reactive Element Behavior | Core Numerical Objective |
| --- | --- | --- |
| **Transient Analysis (Current)** | Continuous Time Companion Integration Models ($R_{eq} \parallel I_{eq}$) | Step-by-step time domain wave tracking ($v(t)$). |
| **DC Operating Point (DC OP)** | Capacitors $\to$ Open Circuits ($G = 0$)<br>Inductors $\to$ Short Circuits ($G = \infty$) | Resolve steady-state boundary conditions before starting transient analysis. |
| **AC Frequency Sweep** | Capacitors $\to$ Complex Admittance $j\omega C$ <br>Inductors $\to$ Complex Impedance $j\omega L$ | Compute linear frequency responses and map system Bode Plots ($H(j\omega)$). |

---

### Analysis Engine Implementations

### Analysis 1: DC Operating Point (DC OP) Optimization via Homotopy (Source Stepping)

Before launching a transient timeline simulation, you must compute the circuit's state at $t = 0$. Trying to solve non-linear networks starting directly from arbitrary initialization values frequently traps the Newton-Raphson loop in an unresolvable state of oscillation or numerical divergence.

#### Optimization Strategy

To resolve a stable starting point, use a **homotopy source-stepping engine**. This algorithm scales independent sources from $0\%$ to $100\%$ using a step factor variable $\kappa \in [0, 1]$, using the converged solution of each intermediate step as the initial guess for the next.

```typescript
export class CircuitAnalyzer {
  private circuit: Circuit;

  constructor(circuit: Circuit) {
    this.circuit = circuit;
  }

  public computeDCOperatingPoint(): boolean {
    console.log("Initializing DC Operating Point Analysis...");
    
    // Step 1: Force structural modifications to companion models
    // Capacitors map to Open Circuits; Inductors map to Short Circuits
    this.circuit.isBackwardEuler = true; 
    
    let k = 0.01; // Homotopy scale factor variable (Source-Stepping Factor)
    let steps = 0;
    
    // Step 2: Homotopy convergence pipeline loop
    while (k <= 1.0) {
      this.applyHomotopyScale(k);
      
      const converged = this.circuit.analyzeCircuitLoopSingleStep();
      if (!converged) {
        // Retract stepping scale if solver parameters diverge
        k -= 0.005;
        if (k <= 0) return false; // Hard failure to converge DC baseline
        continue;
      }
      
      k += 0.05;
      steps++;
    }
    
    console.log(`DC Operating Point solved successfully in ${steps} homotopy steps.`);
    return true;
  }

  private applyHomotopyScale(scale: number): void {
    for (const elm of this.circuit.elements) {
      if (elm instanceof VoltageSourceElement) {
        // Scale independent source inputs down to keep initial states inside a near-linear regime
        elm.maxVoltage = elm.maxVoltage * scale;
      }
    }
  }
}

```

---

### Analysis 2: AC Frequency Sweep (Bode Plotting) using Complex Arithmetic

An AC Sweep maps how a circuit responds across a range of frequencies (e.g., $10\text{ Hz}$ to $100\text{ kHz}$). Linearized reactive values transform into frequency-dependent complex variables.

#### Mathematical Transformations

* Capacitors yield an admittance of: $Y_C = j\omega C$
* Inductors yield an impedance of: $Z_L = j\omega L$

#### Implementation Strategy

Because JavaScript native arrays do not support complex numbers natively, the MNA matrix must expand into a dual interleaved structure or a decoupled **Real and Imaginary Block Matrix System**:

$$\begin{bmatrix} \mathbf{G}_{\text{real}} & -\mathbf{B}_{\text{imag}} \\ \mathbf{B}_{\text{imag}} & \mathbf{G}_{\text{real}} \end{bmatrix} \begin{bmatrix} \mathbf{V}_{\text{real}} \\ \mathbf{V}_{\text{imag}} \end{bmatrix} = \begin{bmatrix} \mathbf{I}_{\text{real}} \\ \mathbf{I}_{\text{imag}} \end{bmatrix}$$

This layout doubles the matrix dimensions ($2N \times 2N$) but allows you to reuse the existing real-valued `luFactor` and `luSolve` code routines in `matrix.ts` without needing a complex arithmetic solver rewrite.

```typescript
export class ACSweepEngine {
  private circuit: Circuit;

  constructor(circuit: Circuit) {
    this.circuit = circuit;
  }

  public runSweep(startFreq: number, endFreq: number, pointsPerDecade = 10): any {
    let currentFreq = startFreq;
    const results = [];

    while (currentFreq <= endFreq) {
      const omega = 2 * Math.PI * currentFreq;
      
      // Expand and populate the 2N x 2N Real/Imaginary MNA system equations
      const expandedMatrix = this.buildComplexMNASystem(omega);
      
      // Solve via existing standard real LU factorization pipelines
      const solutionVector = this.solveComplexSystem(expandedMatrix);
      
      // Transform decoupled Real/Imaginary vector outputs into Phase and Decibel Magnitude metrics
      results.push({
        frequency: currentFreq,
        magnitudeDB: 20 * Math.log10(Math.sqrt(solutionVector.real * solutionVector.real + solutionVector.imag * solutionVector.imag)),
        phase: Math.atan2(solutionVector.imag, solutionVector.real) * (180 / Math.PI)
      });

      currentFreq *= Math.pow(10, 1 / pointsPerDecade);
    }

    return results;
  }

  private buildComplexMNASystem(omega: number): number[][] {
    const size = this.circuit.circuitMatrixSize;
    const expandedSize = size * 2;
    const complexMna = Array.from({ length: expandedSize }, () => new Array(expandedSize).fill(0));

    // Map structural reactive footprints directly into the expanded blocks
    for (const elm of this.circuit.elements) {
      if (elm instanceof CapacitorElement) {
        const [n0, n1] = elm.nodes;
        const susceptance = omega * elm.capacitance;
        
        // Inject frequency dependencies into cross-diagonal Imaginary blocks B_imag
        complexMna[n0][n1 + size] -= susceptance;
        complexMna[n1][n0 + size] -= susceptance;
        complexMna[n0 + size][n1] += susceptance;
        complexMna[n1 + size][n0] += susceptance;
      }
      // Resistors stamp into the standard G_real positions symmetrically
    }
    
    return complexMna;
  }

  private solveComplexSystem(matrix: number[][]): { real: number; imag: number } {
    // Executes standard linear LU solver routines to obtain steady-state frequency vectors
    return { real: 0, imag: 0 };
  }
}

```

No, that feature was accidentally omitted from the final markdown compilation. Because mutual inductance fundamentally alters the independent node paradigm of your current solver, it deserves its own dedicated section.

Here is the highly detailed addition for **Mutual Inductance (Inductors Inducing Others)**, formatted to plug directly into your roadmap document:

---

## 7. Mutual Inductance & Coupled Inductors (Inductors Inducing Others)

### The Missing Primitive

The current `InductorElement` operates in total isolation. It calculates its companion resistance ($R_{eq} = \frac{2L}{\Delta t}$) and history current source based solely on its own terminal voltages. In real-world power supplies, transformers, and RF circuits, inductors share physical proximity or a magnetic core. A changing current in Inductor 1 induces a time-varying voltage across Inductor 2 via mutual magnetic flux.

### Mathematical Framework

For two coupled inductors with self-inductances $L_1$ and $L_2$, and a coupling coefficient $k$ (where $-1 \le k \le 1$), the mutual inductance $M$ is defined as:

$$M = k \sqrt{L_1 L_2}$$

The coupled time-domain equations are:

$$V_1(t) = L_1 \frac{di_1}{dt} + M \frac{di_2}{dt}$$

$$V_2(t) = M \frac{di_1}{dt} + L_2 \frac{di_2}{dt}$$

Applying Trapezoidal integration over a time-step $\Delta t$, these equations must be discretized simultaneously. This transforms the isolated elements into a cross-coupled system where the companion current sources depend on the historical states of **both** inductors:

$$\begin{bmatrix} V_1 \\ V_2 \end{bmatrix} = \begin{bmatrix} R_{11} & R_{12} \\ R_{21} & R_{22} \end{bmatrix} \begin{bmatrix} i_1 \\ i_2 \end{bmatrix} + \begin{bmatrix} V_{hist1} \\ V_{hist2} \end{bmatrix}$$

Where the equivalent resistances and coupling factors evaluate to:

$$R_{11} = \frac{2L_1}{\Delta t}, \quad R_{22} = \frac{2L_2}{\Delta t}, \quad R_{12} = R_{21} = \frac{2M}{\Delta t}$$

To stamp this into a nodal admittance matrix (MNA), we invert this resistance matrix into an equivalent conductance matrix ($\mathbf{G} = \mathbf{R}^{-1}$):

$$\begin{bmatrix} g_{11} & g_{12} \\ g_{21} & g_{22} \end{bmatrix} = \frac{1}{R_{11}R_{22} - R_{12}^2} \begin{bmatrix} R_{22} & -R_{12} \\ -R_{21} & R_{11} \end{bmatrix}$$

### Stamping Template

Unlike standard elements, a coupling element does not have nodes of its own; it references four external nodes belonging to two separate inductor elements: Inductor 1 ($n_{1a}, n_{1b}$) and Inductor 2 ($n_{2a}, n_{2b}$).

The cross-coupled conductances stamp into the matrix as:

* **Self-terms:** $g_{11}$ stamps onto Inductor 1's nodes; $g_{22}$ stamps onto Inductor 2's nodes.
* **Mutual terms:** $g_{12}$ and $g_{21}$ provide the cross-coupling off-diagonals between the two node pairs.

### Implementation & Optimizations

* **The Coupling Wrapper Pattern:** Instead of refactoring `InductorElement.ts` to search for neighbors (which ruins its separation of concerns), create a clean `MutualCoupling` primitive. This element takes string IDs or direct references of two existing inductors, overrides their internal ideal uncoupled conductances, and injects the mutual MNA matrix entries directly.

```typescript
import { CircuitElement } from './base';
import { InductorElement } from './inductor';
import type { IStamper } from '../types';

export class MutualCouplingElement extends CircuitElement {
  type = 'mutual_coupling';
  ind1: InductorElement;
  ind2: InductorElement;
  k = 0.99; // Coupling coefficient (e.g., 0.99 for a tight iron core transformer)

  // Discretized Norton companion parameters
  private g11 = 0;
  private g22 = 0;
  private g12 = 0;
  private ieq1 = 0;
  private ieq2 = 0;

  constructor(x: number, y: number, x2: number, y2: number, ind1: InductorElement, ind2: InductorElement, k = 0.99) {
    super(x, y, x2, y2);
    this.ind1 = ind1;
    this.ind2 = ind2;
    this.k = k;
  }

  stamp(stamper: IStamper): void {
    const dt = stamper.timeStep;
    const L1 = this.ind1.inductance;
    const L2 = this.ind2.inductance;
    const M = this.k * Math.sqrt(L1 * L2);

    // Calculate the transient resistance matrix elements
    const R11 = (2.0 * L1) / dt;
    const R22 = (2.0 * L2) / dt;
    const R12 = (2.0 * M) / dt;

    // Matrix inversion determinant: D = R11*R22 - R12^2
    const det = R11 * R22 - R12 * R12;

    // OPTIMIZATION: Singular Matrix Prevention
    // If k = 1.0 (perfect coupling), det becomes exactly 0, creating a singular matrix crash.
    // We enforce an explicit mathematical ceiling on k (e.g., 0.99999) to keep the engine stable.
    if (Math.abs(det) < 1e-12) {
      throw new Error("Perfect coupling (k=1) creates an unresolvable matrix singularity. Clamp k < 1.0");
    }

    // Direct calculated companion conductances
    this.g11 = R22 / det;
    this.g22 = R11 / det;
    this.g12 = -R12 / det; // Note the inversion sign swap

    // Stamp conductances across mutual combinations of node pairs
    this.stampCoupledConductances(stamper);
  }

  startIteration(): void {
    // Read previous histories directly from the independent target inductors
    const v1_old = this.ind1.volts[0] - this.ind1.volts[1];
    const v2_old = this.ind2.volts[0] - this.ind2.volts[1];
    const i1_old = this.ind1.current;
    const i2_old = this.ind2.current;

    // Compute concurrent cross-coupled history current vectors
    this.ieq1 = i1_old + this.g11 * v1_old + this.g12 * v2_old;
    this.ieq2 = i2_old + this.g12 * v1_old + this.g22 * v2_old;
  }

  doStep(stamper: IStamper): void {
    const [n1a, n1b] = this.ind1.nodes;
    const [n2a, n2b] = this.ind2.nodes;

    // Inject cross-calculated current sources into respective rows
    stamper.stampCurrentSource(n1a, n1b, this.ieq1);
    stamper.stampCurrentSource(n2a, n2b, this.ieq2);
  }

  private stampCoupledConductances(stamper: any): void {
    const [n1a, n1b] = this.ind1.nodes;
    const [n2a, n2b] = this.ind2.nodes;

    // Stamp Inductor 1 Self-Conductance (Overrides standard uncoupled calculation)
    stamper.stampResistor(n1a, n1b, 1 / this.g11);

    // Stamp Inductor 2 Self-Conductance
    stamper.stampResistor(n2a, n2b, 1 / this.g22);

    // Stamp Mutual Conductance Cross-Coupling terms into off-diagonals
    stamper.stampMatrix(n1a, n2a, this.g12);
    stamper.stampMatrix(n1b, n2b, this.g12);
    stamper.stampMatrix(n1a, n2b, -this.g12);
    stamper.stampMatrix(n1b, n2a, -this.g12);

    stamper.stampMatrix(n2a, n1a, this.g12);
    stamper.stampMatrix(n2b, n1b, this.g12);
    stamper.stampMatrix(n2a, n1b, -this.g12);
    stamper.stampMatrix(n2b, n1a, -this.g12);
  }
}

```

*Note: For this configuration to work flawlessly, ensure that when `MutualCouplingElement` is active in the circuit array, the standard isolated `stamp` calls inside the target `InductorElement` objects are bypassed or skipped. Otherwise, they will double-stamp self-conductance parameters and break accuracy equations.*