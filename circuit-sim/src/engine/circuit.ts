// ============================================================
// Circuit Graph & Topology Analysis
// Port of CirSim.java analyzeCircuit() pipeline
// ============================================================

import type {
  ICircuitElement, CircuitNode, CircuitNodeLink,
  RowInfo, IStamper, Point,
} from './types';
import { RowInfoType } from './types';
import { luFactor, luSolve, createMatrix, copyMatrix, copyVector } from './matrix';
import { WireElement } from './elements/wire';

/** Point equality for node mapping */
function ptKey(p: Point): string { return `${p.x},${p.y}`; }

/** Wire info for calculating wire currents */
interface WireInfo {
  wire: WireElement;
  neighbors: ICircuitElement[];
  post: number;
}

/**
 * The Circuit class manages the entire simulation state:
 * node list, element list, MNA matrix, and solver.
 */
export class Circuit implements IStamper {
  elements: ICircuitElement[] = [];
  nodeList: CircuitNode[] = [];
  voltageSources: ICircuitElement[] = [];
  voltageSourceCount = 0;

  // MNA matrix state
  circuitMatrix: number[][] = [];
  circuitRightSide: Float64Array = new Float64Array(0);
  origMatrix: number[][] = [];
  origRightSide: Float64Array = new Float64Array(0);
  circuitPermute: number[] = [];
  circuitRowInfo: RowInfo[] = [];
  circuitMatrixSize = 0;
  circuitMatrixFullSize = 0;
  circuitNonLinear = false;
  circuitNeedsMap = false;
  nodeVoltages: Float64Array = new Float64Array(0);
  lastNodeVoltages: Float64Array = new Float64Array(0);

  // Simulation time
  t = 0;
  timeStep = 5e-6;
  maxTimeStep = 5e-6;

  // Wire optimization
  private wireInfoList: WireInfo[] = [];
  private nodeMap = new Map<string, { node: number }>();

  // State
  stopMessage: string | null = null;
  converged = false;

  get nodeCount(): number { return this.nodeList.length; }

  // ==============================================================
  // STAMPER INTERFACE (IStamper)
  // These methods are called by elements to fill the matrix
  // ==============================================================

  stampMatrix(i: number, j: number, x: number): void {
    if (i > 0 && j > 0) {
      if (this.circuitNeedsMap) {
        i = this.circuitRowInfo[i - 1].mapRow;
        const ri = this.circuitRowInfo[j - 1];
        if (ri.type === RowInfoType.ROW_CONST) {
          this.circuitRightSide[i] -= x * ri.value;
          return;
        }
        j = ri.mapCol;
      } else {
        i--;
        j--;
      }
      this.circuitMatrix[i][j] += x;
    }
  }

  stampRightSide(i: number, x?: number): void {
    if (i > 0) {
      if (x === undefined) {
        // Mark this row's right side as changing in doStep
        this.circuitRowInfo[i - 1].rsChanges = true;
        return;
      }
      if (this.circuitNeedsMap) {
        i = this.circuitRowInfo[i - 1].mapRow;
      } else {
        i--;
      }
      this.circuitRightSide[i] += x;
    }
  }

  stampResistor(n1: number, n2: number, r: number): void {
    const r0 = 1 / r;
    if (!isFinite(r0)) {
      console.error('Bad resistance:', r);
      return;
    }
    this.stampMatrix(n1, n1, r0);
    this.stampMatrix(n2, n2, r0);
    this.stampMatrix(n1, n2, -r0);
    this.stampMatrix(n2, n1, -r0);
  }

  stampConductance(n1: number, n2: number, g: number): void {
    this.stampMatrix(n1, n1, g);
    this.stampMatrix(n2, n2, g);
    this.stampMatrix(n1, n2, -g);
    this.stampMatrix(n2, n1, -g);
  }

  stampVoltageSource(n1: number, n2: number, vs: number, v?: number): void {
    const vn = this.nodeList.length + vs;
    this.stampMatrix(vn, n1, -1);
    this.stampMatrix(vn, n2, 1);
    this.stampMatrix(n1, vn, 1);
    this.stampMatrix(n2, vn, -1);
    if (v !== undefined) {
      this.stampRightSide(vn, v);
    } else {
      this.stampRightSide(vn);
    }
  }

  updateVoltageSource(_n1: number, _n2: number, vs: number, v: number): void {
    const vn = this.nodeList.length + vs;
    this.stampRightSide(vn, v);
  }

  stampCurrentSource(n1: number, n2: number, i: number): void {
    this.stampRightSide(n1, -i);
    this.stampRightSide(n2, i);
  }

  stampNonLinear(i: number): void {
    if (i > 0) {
      this.circuitRowInfo[i - 1].lsChanges = true;
    }
  }

  // ==============================================================
  // TOPOLOGY ANALYSIS
  // ==============================================================

  addElement(elm: ICircuitElement): void {
    this.elements.push(elm);
  }

  removeElement(id: string): void {
    this.elements = this.elements.filter(e => e.id !== id);
  }

  /**
   * Full circuit analysis pipeline.
   * Called whenever the circuit topology changes.
   */
  analyzeCircuit(): void {
    if (this.elements.length === 0) return;

    this.stopMessage = null;
    this.nodeList = [];
    this.nodeMap.clear();

    // Step 1: Wire closure — merge nodes connected by wires
    this.calculateWireClosure();

    // Step 2: Set ground node (node 0)
    this.setGroundNode();

    // Step 3: Build node list and assign node indices
    this.makeNodeList();

    // Step 4: Calculate wire info for wire current computation
    this.calcWireInfo();
    this.nodeMap.clear();

    // Step 5: Determine if circuit is nonlinear + assign voltage sources
    let vsCount = 0;
    this.circuitNonLinear = false;
    for (const ce of this.elements) {
      if (ce.nonLinear()) this.circuitNonLinear = true;
      const ivs = ce.getVoltageSourceCount();
      for (let j = 0; j < ivs; j++) {
        this.voltageSources[vsCount] = ce;
        ce.setVoltageSource(j, vsCount++);
      }
    }
    this.voltageSourceCount = vsCount;

    // Step 6: Find and connect unconnected nodes
    this.findUnconnectedNodes();

    // Step 7: Stamp the matrix
    this.timeStep = this.maxTimeStep;
    this.stampCircuit();
  }

  private calculateWireClosure(): void {
    this.wireInfoList = [];
    for (const ce of this.elements) {
      if (!(ce instanceof WireElement)) continue;

      this.wireInfoList.push({
        wire: ce, neighbors: [], post: 0,
      });

      const k0 = ptKey(ce.getPost(0));
      const k1 = ptKey(ce.getPost(1));
      const cn = this.nodeMap.get(k0);
      const cn2 = this.nodeMap.get(k1);

      if (cn && cn2) {
        // Merge: point all cn2 refs to cn
        for (const [key, entry] of this.nodeMap) {
          if (entry === cn2) this.nodeMap.set(key, cn);
        }
      } else if (cn) {
        this.nodeMap.set(k1, cn);
      } else if (cn2) {
        this.nodeMap.set(k0, cn2);
      } else {
        const newEntry = { node: -1 };
        this.nodeMap.set(k0, newEntry);
        this.nodeMap.set(k1, newEntry);
      }
    }
  }

  private setGroundNode(): void {
    let gotGround = false;
    let gotRail = false;
    let volt: ICircuitElement | null = null;

    for (const ce of this.elements) {
      if (ce.type === 'ground') { gotGround = true; }
      if (ce.type === 'rail') gotRail = true;
      if (volt === null && ce.type === 'voltage') volt = ce;
    }

    // Allocate node 0
    const cn: CircuitNode = { links: [], internal: false };
    this.nodeList.push(cn);

    if (gotGround) {
      // Map every ground element's post to node 0
      for (const ce of this.elements) {
        if (ce.type !== 'ground') continue;
        const pt = ce.getPost(0);
        const k = ptKey(pt);
        const cln = this.nodeMap.get(k);
        if (cln) {
          cln.node = 0;
        } else {
          this.nodeMap.set(k, { node: 0 });
        }
      }
    } else if (volt && !gotRail) {
      // No ground element: voltage source's first terminal is ground
      const pt = volt.getPost(0);
      const k = ptKey(pt);
      const cln = this.nodeMap.get(k);
      if (cln) {
        cln.node = 0;
      } else {
        this.nodeMap.set(k, { node: 0 });
      }
    }
  }

  private makeNodeList(): void {
    let vsCount = 0;

    for (const ce of this.elements) {
      if (ce instanceof WireElement) continue; // wires eliminated

      const posts = ce.getPostCount();
      const inodes = ce.getInternalNodeCount();
      const ivs = ce.getVoltageSourceCount();

      // Assign nodes for external posts
      for (let j = 0; j < posts; j++) {
        const pt = ce.getPost(j);
        const k = ptKey(pt);
        const cln = this.nodeMap.get(k);

        if (!cln || cln.node === -1) {
          // New node
          const cn: CircuitNode = { links: [], internal: false };
          const cnl: CircuitNodeLink = { num: j, elmId: ce.id };
          cn.links.push(cnl);
          ce.setNode(j, this.nodeList.length);
          if (cln) {
            cln.node = this.nodeList.length;
          } else {
            this.nodeMap.set(k, { node: this.nodeList.length });
          }
          this.nodeList.push(cn);
        } else {
          const n = cln.node;
          const cnl: CircuitNodeLink = { num: j, elmId: ce.id };
          this.nodeList[n].links.push(cnl);
          ce.setNode(j, n);
          if (n === 0) ce.setNodeVoltage(j, 0);
        }
      }

      // Assign nodes for internal nodes
      for (let j = 0; j < inodes; j++) {
        const cn: CircuitNode = { links: [], internal: true };
        const cnl: CircuitNodeLink = { num: j + posts, elmId: ce.id };
        cn.links.push(cnl);
        ce.setNode(j + posts, this.nodeList.length);
        this.nodeList.push(cn);
      }

      vsCount += ivs;
    }

    this.voltageSources = new Array(vsCount);
  }

  private calcWireInfo(): void {
    // For Phase 1, wire current calculation is simplified.
    // Full implementation with topological sort comes in Phase 2.
    for (const wi of this.wireInfoList) {
      const wire = wi.wire;
      const node0 = wire.getNode(0);
      if (node0 < this.nodeList.length) {
        const cn = this.nodeList[node0];
        wi.neighbors = cn.links
          .map(link => this.elements.find(e => e.id === link.elmId)!)
          .filter(e => e && e !== wire);
        wi.post = 0;
      }
    }
  }

  private findUnconnectedNodes(): void {
    const closure = new Array(this.nodeList.length).fill(false);
    closure[0] = true;
    let changed = true;

    while (changed) {
      changed = false;
      for (const ce of this.elements) {
        if (ce instanceof WireElement) continue;
        for (let j = 0; j < ce.getConnectionNodeCount(); j++) {
          const nodeJ = ce.getConnectionNode(j);
          if (!closure[nodeJ]) {
            if (ce.hasGroundConnection(j)) {
              closure[nodeJ] = true;
              changed = true;
            }
            continue;
          }
          for (let k = 0; k < ce.getConnectionNodeCount(); k++) {
            if (j === k) continue;
            const nodeK = ce.getConnectionNode(k);
            if (ce.getConnection(j, k) && !closure[nodeK]) {
              closure[nodeK] = true;
              changed = true;
            }
          }
        }
      }

      if (changed) continue;

      // Connect first unconnected node to ground via large resistor
      for (let i = 0; i < this.nodeList.length; i++) {
        if (!closure[i] && !this.nodeList[i].internal) {
          closure[i] = true;
          changed = true;
          // Will stamp resistor during stampCircuit
          break;
        }
      }
    }
  }

  private stampCircuit(): void {
    const matrixSize = this.nodeList.length - 1 + this.voltageSourceCount;
    this.circuitMatrix = createMatrix(matrixSize);
    this.circuitRightSide = new Float64Array(matrixSize);
    this.nodeVoltages = new Float64Array(this.nodeList.length - 1);
    if (!this.lastNodeVoltages || this.lastNodeVoltages.length !== this.nodeVoltages.length) {
      this.lastNodeVoltages = new Float64Array(this.nodeList.length - 1);
    }
    this.origMatrix = createMatrix(matrixSize);
    this.origRightSide = new Float64Array(matrixSize);
    this.circuitMatrixSize = this.circuitMatrixFullSize = matrixSize;
    this.circuitRowInfo = [];
    this.circuitPermute = new Array(matrixSize).fill(0);
    for (let i = 0; i < matrixSize; i++) {
      this.circuitRowInfo[i] = {
        type: RowInfoType.ROW_NORMAL,
        mapRow: 0, mapCol: 0, value: 0,
        rsChanges: false, lsChanges: false, dropRow: false,
      };
    }
    this.circuitNeedsMap = false;

    // Stamp all elements
    for (const ce of this.elements) {
      if (ce instanceof WireElement) continue;
      ce.stamp(this);
    }

    // Simplify matrix
    if (!this.simplifyMatrix(matrixSize)) return;
    if (!this.circuitMatrix) return;

    // For linear circuits, factor once
    if (!this.circuitNonLinear) {
      if (!luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
        this.stop('Singular matrix!');
        return;
      }
    }
  }

  private simplifyMatrix(matrixSize: number): boolean {
    // Find rows with only one nonzero non-const entry → that variable is constant
    for (let i = 0; i < matrixSize; i++) {
      let qp = -1;
      let qv = 0;
      const re = this.circuitRowInfo[i];
      if (re.lsChanges || re.dropRow || re.rsChanges) continue;

      let rsadd = 0;
      let j: number;
      for (j = 0; j < matrixSize; j++) {
        const q = this.circuitMatrix[i][j];
        if (this.circuitRowInfo[j].type === RowInfoType.ROW_CONST) {
          rsadd -= this.circuitRowInfo[j].value * q;
          continue;
        }
        if (q === 0) continue;
        if (qp === -1) { qp = j; qv = q; continue; }
        break; // more than one nonzero → give up
      }

      if (j === matrixSize) {
        if (qp === -1) {
          // All non-const entries in this row are zero.
          // If right side is effectively zero too, it's a redundant row — just drop it.
          if (Math.abs(this.circuitRightSide[i] + rsadd) < 1e-10) {
            this.circuitRowInfo[i].dropRow = true;
            continue;
          }
          this.stop('Matrix error (inconsistent)');
          return false;
        }
        const elt = this.circuitRowInfo[qp];
        if (elt.type !== RowInfoType.ROW_NORMAL) continue;
        elt.type = RowInfoType.ROW_CONST;
        elt.value = (this.circuitRightSide[i] + rsadd) / qv;
        this.circuitRowInfo[i].dropRow = true;
        i = -1; // restart
      }
    }

    // Build new compressed matrix
    let nn = 0;
    for (let i = 0; i < matrixSize; i++) {
      const elt = this.circuitRowInfo[i];
      if (elt.type === RowInfoType.ROW_NORMAL) {
        elt.mapCol = nn++;
      } else if (elt.type === RowInfoType.ROW_CONST) {
        elt.mapCol = -1;
      }
    }

    const newSize = nn;
    const newMatrix = createMatrix(newSize);
    const newRs = new Float64Array(newSize);
    let ii = 0;

    for (let i = 0; i < matrixSize; i++) {
      const rri = this.circuitRowInfo[i];
      if (rri.dropRow) { rri.mapRow = -1; continue; }
      newRs[ii] = this.circuitRightSide[i];
      rri.mapRow = ii;
      for (let j = 0; j < matrixSize; j++) {
        const ri = this.circuitRowInfo[j];
        if (ri.type === RowInfoType.ROW_CONST) {
          newRs[ii] -= ri.value * this.circuitMatrix[i][j];
        } else {
          newMatrix[ii][ri.mapCol] += this.circuitMatrix[i][j];
        }
      }
      ii++;
    }

    this.circuitMatrix = newMatrix;
    this.circuitRightSide = newRs;
    this.circuitMatrixSize = newSize;

    // Save original for nonlinear iteration reset
    for (let i = 0; i < newSize; i++) this.origRightSide[i] = newRs[i];
    this.origMatrix = createMatrix(newSize);
    copyMatrix(newMatrix, this.origMatrix, newSize);
    this.circuitNeedsMap = true;

    return true;
  }

  // ==============================================================
  // SIMULATION STEP
  // ==============================================================

  /**
   * Run one timestep of the simulation.
   * For nonlinear circuits, iterates Newton-Raphson until convergence.
   */
  runStep(): boolean {
    if (!this.circuitMatrix || this.elements.length === 0) return false;

    // Start iteration for all elements
    for (const ce of this.elements) ce.startIteration();

    const maxSubIter = this.circuitNonLinear ? 5000 : 1;

    for (let subiter = 0; subiter < maxSubIter; subiter++) {
      this.converged = true;

      // Reset right side
      copyVector(this.origRightSide, this.circuitRightSide, this.circuitMatrixSize);

      // For nonlinear: also reset matrix
      if (this.circuitNonLinear) {
        copyMatrix(this.origMatrix, this.circuitMatrix, this.circuitMatrixSize);
      }

      // Let elements stamp nonlinear contributions
      for (const ce of this.elements) {
        if (ce instanceof WireElement) continue;
        ce.doStep(this);
      }

      if (this.stopMessage) return false;

      // Check for NaN/Infinity in matrix
      for (let j = 0; j < this.circuitMatrixSize; j++) {
        for (let i = 0; i < this.circuitMatrixSize; i++) {
          const x = this.circuitMatrix[i][j];
          if (isNaN(x) || !isFinite(x)) {
            this.stop('NaN/infinite matrix!');
            return false;
          }
        }
      }

      // Factor and solve
      if (this.circuitNonLinear) {
        if (this.converged && subiter > 0) break;
        if (!luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
          this.stop('Singular matrix!');
          return false;
        }
      }

      luSolve(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute, this.circuitRightSide);
      this.applySolvedRightSide(this.circuitRightSide);

      if (!this.circuitNonLinear) break;
    }

    // Advance time
    this.t += this.timeStep;

    // Post-step: calculate currents
    for (const ce of this.elements) ce.stepFinished();

    // Calculate wire currents
    this.calcWireCurrents();

    // Save node voltages for potential rollback
    copyVector(this.nodeVoltages, this.lastNodeVoltages, this.nodeVoltages.length);

    return true;
  }

  private applySolvedRightSide(rs: Float64Array): void {
    for (let j = 0; j < this.circuitMatrixFullSize; j++) {
      const ri = this.circuitRowInfo[j];
      let res: number;
      if (ri.type === RowInfoType.ROW_CONST) {
        res = ri.value;
      } else {
        res = rs[ri.mapCol];
      }

      if (isNaN(res)) {
        this.converged = false;
        break;
      }

      if (j < this.nodeList.length - 1) {
        this.nodeVoltages[j] = res;
      } else {
        const ji = j - (this.nodeList.length - 1);
        this.voltageSources[ji].setCurrent(ji, res);
      }
    }

    // Push voltages to elements
    for (let j = 0; j < this.nodeVoltages.length; j++) {
      const cn = this.nodeList[j + 1];
      if (!cn) continue;
      for (const link of cn.links) {
        const elm = this.elements.find(e => e.id === link.elmId);
        if (elm) elm.setNodeVoltage(link.num, this.nodeVoltages[j]);
      }
    }
  }

  private calcWireCurrents(): void {
    for (const wi of this.wireInfoList) {
      let cur = 0;
      const p = wi.wire.getPost(wi.post);
      for (const neighbor of wi.neighbors) {
        // Find which node of neighbor connects to this post
        for (let n = 0; n < neighbor.getPostCount(); n++) {
          const np = neighbor.getPost(n);
          if (np.x === p.x && np.y === p.y) {
            cur += neighbor.getCurrentIntoNode(n);
            break;
          }
        }
      }
      wi.wire.current = wi.post === 0 ? cur : -cur;
    }
  }

  stop(msg: string): void {
    this.stopMessage = msg;
    console.error('Simulation stopped:', msg);
  }

  reset(): void {
    this.t = 0;
    this.stopMessage = null;
    for (const ce of this.elements) ce.reset();
    this.analyzeCircuit();
  }

  /** Get the element by ID */
  getElement(id: string): ICircuitElement | undefined {
    return this.elements.find(e => e.id === id);
  }

  /** Build a snapshot of simulation state for the UI */
  getState() {
    return {
      t: this.t,
      timeStep: this.timeStep,
      nodeVoltages: Array.from(this.nodeVoltages),
      elementStates: this.elements.map(e => ({
        id: e.id,
        volts: Array.from(e.volts),
        current: e.getCurrent(),
        power: e.type === 'wire' ? 0 : -(e.volts[1] - e.volts[0]) * e.getCurrent(),
      })),
      converged: this.converged,
      stopMessage: this.stopMessage,
      fps: 0,
      stepsPerSec: 0,
    };
  }
}
