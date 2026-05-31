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
function ptKey(p: Point): string { return `${Math.round(p.x)},${Math.round(p.y)}`; }

/** Wire info for calculating wire currents */
interface WireInfo {
  wire: WireElement;
  neighbors: ICircuitElement[];
  post: number;
}

interface WireTreeNode {
  node: string;
  edgeToParent: { wire: WireElement; isForward: boolean } | null;
  children: WireTreeNode[];
}

interface WireNodeData {
  wires: { wire: WireElement; isForward: boolean; isChord?: boolean }[];
  nonWireContributors: { element: ICircuitElement; post: number }[];
}

/**
 * The Circuit class manages the entire simulation state:
 * node list, element list, MNA matrix, and solver.
 */
export class Circuit implements IStamper {
  elements: ICircuitElement[] = [];
  elementMap: Map<string, ICircuitElement> = new Map();
  nodeList: CircuitNode[] = [];
  voltageSources: ICircuitElement[] = [];
  voltageSourceCount = 0;

  // MNA matrix state
  circuitMatrix: Float64Array = new Float64Array(0);
  circuitRightSide: Float64Array = new Float64Array(0);
  origMatrix: Float64Array = new Float64Array(0);
  origRightSide: Float64Array = new Float64Array(0);
  floatingNodes: number[] = [];

  // Wire graph state
  _wireForest?: WireTreeNode[];
  _wireNodesData?: Map<string, WireNodeData>;

  // Info
  circuitPermute: number[] = [];
  circuitRowInfo: RowInfo[] = [];
  circuitMatrixSize = 0;
  circuitMatrixFullSize = 0;
  circuitNonLinear = false;
  circuitNeedsMap = false;
  nodeVoltages: Float64Array = new Float64Array(0);
  lastNodeVoltages: Float64Array = new Float64Array(0);
  prevNodeVoltages: Float64Array = new Float64Array(0);

  // Simulation time
  t = 0;
  timeStep = 5e-6;
  maxTimeStep = 5e-6;

  // Solver Breakpoint Manager queue (sorted, deduplicated)
  breakpoints: number[] = [];
  private stampedTimeStep = -1;
  private stampedBackwardEuler = false;

  // Wire optimization
  private wireInfoList: WireInfo[] = [];
  private nodeMap = new Map<string, { node: number }>();

  // State
  stopMessage: string | null = null;
  converged = false;
  subIterations = 0;
  isBackwardEuler = true;
  isDCOperatingPoint = false;
  isACSweep = false;
  homotopyScale?: number;

  // Telemetry variables for the MatrixInspector / Solver visualizer
  lastG: Float64Array = new Float64Array(0);
  lastI: number[] = [];
  lastV: number[] = [];
  lastErrors: number[] = [];

  // Spatial Index for fast hit testing (P3)
  private spatialGrid = new Map<string, ICircuitElement[]>();
  private readonly CELL_SIZE = 100;
  private readonly INDEX_EXPANSION = 20;

  rebuildSpatialIndex(): void {
    this.spatialGrid.clear();
    for (const elm of this.elements) {
      const minX = Math.min(elm.x, elm.x2);
      const maxX = Math.max(elm.x, elm.x2);
      const minY = Math.min(elm.y, elm.y2);
      const maxY = Math.max(elm.y, elm.y2);

      const cellXMin = Math.floor((minX - this.INDEX_EXPANSION) / this.CELL_SIZE);
      const cellXMax = Math.floor((maxX + this.INDEX_EXPANSION) / this.CELL_SIZE);
      const cellYMin = Math.floor((minY - this.INDEX_EXPANSION) / this.CELL_SIZE);
      const cellYMax = Math.floor((maxY + this.INDEX_EXPANSION) / this.CELL_SIZE);

      for (let cx = cellXMin; cx <= cellXMax; cx++) {
        for (let cy = cellYMin; cy <= cellYMax; cy++) {
          const key = `${cx},${cy}`;
          let list = this.spatialGrid.get(key);
          if (!list) {
            list = [];
            this.spatialGrid.set(key, list);
          }
          list.push(elm);
        }
      }
    }
  }

  getElementsByPosition(px: number, py: number): ICircuitElement[] {
    const cx = Math.floor(px / this.CELL_SIZE);
    const cy = Math.floor(py / this.CELL_SIZE);
    const key = `${cx},${cy}`;
    return this.spatialGrid.get(key) || [];
  }

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
          // ADDED: Prevent writing to dropped rows (i == -1)
          if (i >= 0) {
            this.circuitRightSide[i] -= x * ri.value;
          }
          return;
        }
        j = ri.mapCol;
        // ADDED: Prevent accessing undefined rows in the matrix
        if (i < 0) return;
      } else {
        i--;
        j--;
      }
      this.circuitMatrix[i * this.circuitMatrixSize + j] += x;
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
        // ADDED: Prevent writing to dropped rows
        if (i < 0) return;
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

  registerBreakpoint(bpTime: number): void {
    if (bpTime <= this.t) return;
    let insertIdx = 0;
    while (insertIdx < this.breakpoints.length && this.breakpoints[insertIdx] < bpTime) {
      insertIdx++;
    }
    if (insertIdx < this.breakpoints.length && Math.abs(this.breakpoints[insertIdx] - bpTime) < 1e-12) {
      return;
    }
    this.breakpoints.splice(insertIdx, 0, bpTime);
  }

  // ==============================================================
  // TOPOLOGY ANALYSIS
  // ==============================================================

  addElement(elm: ICircuitElement): void {
    this.elements.push(elm);
    this.elementMap.set(elm.id, elm);
  }

  removeElement(id: string): void {
    this.elements = this.elements.filter(e => e.id !== id);
    this.elementMap.delete(id);
  }

  clearElements(): void {
    this.elements = [];
    this.elementMap.clear();
  }

  /**
   * Full circuit analysis pipeline.
   * Called whenever the circuit topology changes.
   */
  analyzeCircuit(): void {
    if (this.elements.length === 0) {
      this.lastG = new Float64Array(0);
      this.lastI = [];
      this.lastV = [];
      this.lastErrors = [];
      this.nodeList = [];
      this.elementMap.clear();
      this.circuitMatrix = new Float64Array(0);
      this.voltageSources = [];
      this.voltageSourceCount = 0;
      this.circuitMatrixSize = 0;
      this.circuitMatrixFullSize = 0;
      this.floatingNodes = [];
      this.circuitPermute = [];
      this.circuitRowInfo = [];
      this.nodeMap.clear();
      this.wireInfoList = [];
      this._wireForest = undefined;
      this._wireNodesData = undefined;
      this.nodeVoltages = new Float64Array(0);
      this.lastNodeVoltages = new Float64Array(0);
      this.circuitRightSide = new Float64Array(0);
      this.origMatrix = new Float64Array(0);
      this.origRightSide = new Float64Array(0);
      this.spatialGrid.clear();
      return;
    }

    this.stopMessage = null;
    this.isBackwardEuler = true;
    this.nodeList = [];
    this.nodeMap.clear();
    this.floatingNodes = [];
    this.breakpoints = [];

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

    // Rebuild spatial index
    this.rebuildSpatialIndex();
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
        if (cn !== cn2) {
          const keysToUpdate: string[] = [];
          for (const [key, entry] of this.nodeMap.entries()) {
            if (entry === cn2) keysToUpdate.push(key);
          }
          for (const key of keysToUpdate) {
            this.nodeMap.set(key, cn);
          }
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
    // Phase 2: Complete Spanning Tree implementation for wire subgraphs
    const wireNodes = new Map<string, {
      wires: { wire: WireElement, isForward: boolean, isChord: boolean }[];
      nonWireContributors: { element: ICircuitElement, post: number }[];
    }>();

    // Reset wire status
    for (const wi of this.wireInfoList) {
      wi.wire.current = 0;
    }

    // Build the adjacency list for the wire graph
    for (const wi of this.wireInfoList) {
      const w = wi.wire;
      const k0 = ptKey(w.getPost(0));
      const k1 = ptKey(w.getPost(1));

      if (!wireNodes.has(k0)) {
        wireNodes.set(k0, { wires: [], nonWireContributors: [] });
      }
      if (!wireNodes.has(k1)) {
        wireNodes.set(k1, { wires: [], nonWireContributors: [] });
      }

      wireNodes.get(k0)!.wires.push({ wire: w, isForward: true, isChord: false });
      wireNodes.get(k1)!.wires.push({ wire: w, isForward: false, isChord: false });
    }

    // Assign non-wire components to the wire nodes they connect to
    for (const ce of this.elements) {
      if (ce instanceof WireElement) continue;
      for (let n = 0; n < ce.getPostCount(); n++) {
        const pt = ce.getPost(n);
        const k = ptKey(pt);
        if (wireNodes.has(k)) {
          const nodeData = wireNodes.get(k)!;
          nodeData.nonWireContributors.push({ element: ce, post: n });
        }
      }
    }

    // DFS to find Spanning Tree and identify chord edges
    const visitedNodes = new Set<string>();
    const dfsForest: WireTreeNode[] = [];

    for (const rootKey of wireNodes.keys()) {
      if (visitedNodes.has(rootKey)) continue;

      const rootNode: WireTreeNode = { node: rootKey, edgeToParent: null, children: [] };
      visitedNodes.add(rootKey);

      const stack: { treeNode: WireTreeNode; wireIndex: number }[] = [
        { treeNode: rootNode, wireIndex: 0 }
      ];

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const { treeNode, wireIndex } = top;
        const nodeKey = treeNode.node;
        const nodeData = wireNodes.get(nodeKey)!;

        if (wireIndex < nodeData.wires.length) {
          const edge = nodeData.wires[wireIndex];
          top.wireIndex++;

          if (treeNode.edgeToParent && edge.wire === treeNode.edgeToParent.wire) {
            continue;
          }

          const nextKey = edge.isForward ? ptKey(edge.wire.getPost(1)) : ptKey(edge.wire.getPost(0));

          if (visitedNodes.has(nextKey)) {
            edge.isChord = true;
            const destNode = wireNodes.get(nextKey)!;
            const revEdge = destNode.wires.find(w => w.wire === edge.wire);
            if (revEdge) revEdge.isChord = true;
          } else {
            visitedNodes.add(nextKey);
            const childEdge = { wire: edge.wire, isForward: edge.isForward };
            const childNode: WireTreeNode = { node: nextKey, edgeToParent: childEdge, children: [] };
            treeNode.children.push(childNode);
            stack.push({ treeNode: childNode, wireIndex: 0 });
          }
        } else {
          stack.pop();
        }
      }

      dfsForest.push(rootNode);
    }

    // Save the traversal data for calcWireCurrents
    this._wireForest = dfsForest;
    this._wireNodesData = wireNodes;
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
          this.floatingNodes.push(i);
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
    if (!this.prevNodeVoltages || this.prevNodeVoltages.length !== this.nodeVoltages.length) {
      this.prevNodeVoltages = new Float64Array(this.nodeList.length - 1);
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
    // Pre-pass for coupled inductors: reset isCoupled flag
    for (const ce of this.elements) {
      if (ce.type === 'inductor') {
        (ce as any).isCoupled = false;
      }
    }
    // Set isCoupled for target inductors referenced by mutual coupling overlays
    for (const ce of this.elements) {
      if (ce.type === 'mutual') {
        const mc = ce as any;
        const ind1 = this.getElement(mc.ind1Id) as any;
        const ind2 = this.getElement(mc.ind2Id) as any;
        if (ind1 && ind1.type === 'inductor') {
          ind1.isCoupled = true;
          mc.ind1 = ind1;
        } else {
          mc.ind1 = null;
        }
        if (ind2 && ind2.type === 'inductor') {
          ind2.isCoupled = true;
          mc.ind2 = ind2;
        } else {
          mc.ind2 = null;
        }
      }
    }

    // Stamp all elements
    for (const ce of this.elements) {
      if (ce instanceof WireElement) continue;
      ce.stamp(this);
    }

    // Stamp floating nodes
    for (const fn of this.floatingNodes) {
      this.stampResistor(fn, 0, 1e9);
    }

    if (this.isACSweep) {
      // For AC Sweep, bypass matrix simplification and factorization on the real matrix,
      // since the real part may be singular (e.g. ideal capacitors/inductors) and will be
      // solved as a complex system of size 2N.
      for (let i = 0; i < matrixSize; i++) {
        this.origRightSide[i] = this.circuitRightSide[i];
      }
      copyMatrix(this.circuitMatrix, this.origMatrix, matrixSize);
      this.stampedTimeStep = this.timeStep;
      this.stampedBackwardEuler = !!this.isBackwardEuler;
      return;
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
    this.stampedTimeStep = this.timeStep;
    this.stampedBackwardEuler = !!this.isBackwardEuler;
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
        const q = this.circuitMatrix[i * this.circuitMatrixSize + j];
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
          newRs[ii] -= ri.value * this.circuitMatrix[i * this.circuitMatrixSize + j];
        } else {
          newMatrix[ii * newSize + ri.mapCol] += this.circuitMatrix[i * this.circuitMatrixSize + j];
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
  runStep(captureTelemetry = false): boolean {
    if (!this.circuitMatrix || this.nodeList.length === 0 || this.elements.length === 0) return false;

    if (this.t > 0) {
      this.isBackwardEuler = false;
    }

    const MIN_STEP = 1e-9;
    while (this.breakpoints.length > 0 && this.breakpoints[0] - this.t < MIN_STEP) {
      this.breakpoints.shift();
    }

    if (this.breakpoints.length > 0 && this.breakpoints[0] <= this.t + this.maxTimeStep) {
      const bp = this.breakpoints[0];
      this.breakpoints.shift();
      this.timeStep = bp - this.t;
      this.isBackwardEuler = true;
    } else {
      this.timeStep = this.maxTimeStep;
    }

    if (this.timeStep !== this.stampedTimeStep || !!this.isBackwardEuler !== this.stampedBackwardEuler) {
      this.stampCircuit();
    }

    if (!this.circuitMatrix) return false;

    // Start iteration for all elements
    for (const ce of this.elements) ce.startIteration();

    const maxSubIter = this.circuitNonLinear ? 5000 : 1;
    if (captureTelemetry) {
      this.lastErrors = [];
    }

    for (let subiter = 0; subiter < maxSubIter; subiter++) {
      if (this.circuitNonLinear && this.converged && subiter > 0) {
        break;
      }

      copyVector(this.nodeVoltages, this.prevNodeVoltages, this.nodeVoltages.length);

      if (!this.runSubIteration(subiter, captureTelemetry)) {
        return false;
      }

      if (this.circuitNonLinear && captureTelemetry) {
        let maxDiff = 0;
        for (let j = 0; j < this.nodeVoltages.length; j++) {
          maxDiff = Math.max(maxDiff, Math.abs(this.nodeVoltages[j] - this.prevNodeVoltages[j]));
        }
        this.lastErrors.push(maxDiff);
      }

      if (!this.circuitNonLinear) break;
    }

    // Advance time
    this.t += this.timeStep;
    this.isBackwardEuler = false;

    // Post-step: calculate currents
    for (const ce of this.elements) ce.stepFinished();

    // Calculate wire currents
    this.calcWireCurrents();

    // Save node voltages for potential rollback
    copyVector(this.nodeVoltages, this.lastNodeVoltages, this.nodeVoltages.length);

    // Overload safety check: stop simulation if voltages/currents exceed safe limits
    for (let j = 0; j < this.nodeVoltages.length; j++) {
      if (Math.abs(this.nodeVoltages[j]) > 1000.0) {
        this.stop("Overload: Voltage exceeds 1000V limit!");
        return false;
      }
    }
    for (const ce of this.elements) {
      if (Math.abs(ce.getCurrent()) > 50.0) {
        this.stop("Overload: Current exceeds 50A limit!");
        return false;
      }
    }

    return true;
  }

  computeDCOperatingPoint(): boolean {
    if (!this.circuitMatrix || this.nodeList.length === 0 || this.elements.length === 0) return false;

    this.stopMessage = null;

    const oldDCOp = this.isDCOperatingPoint;
    const oldACSweep = this.isACSweep;
    const oldTimeStep = this.timeStep;
    const oldBackwardEuler = this.isBackwardEuler;

    this.isDCOperatingPoint = true;
    this.isACSweep = false;
    this.isBackwardEuler = true;

    const savedVoltages = new Float64Array(this.nodeVoltages.length);
    copyVector(this.nodeVoltages, savedVoltages, this.nodeVoltages.length);

    const savedElementStates = this.elements.map(ce => {
      return {
        element: ce,
        volts: ce.volts ? ce.volts.slice() : [],
        current: (ce as any).current,
        vdio: (ce as any).vdio,
        lastvoltdiff: (ce as any).lastvoltdiff,
        lastGeq: (ce as any).lastGeq,
        lastIeq: (ce as any).lastIeq,
        lastVbe: (ce as any).lastVbe,
        lastVbc: (ce as any).lastVbc,
        currentSourceValue: (ce as any).currentSourceValue,
      };
    });

    const steps = 10;
    let success = true;

    for (let step = 0; step <= steps; step++) {
      const kappa = step / steps;
      this.homotopyScale = kappa;

      this.stampCircuit();

      const maxSubIter = this.circuitNonLinear ? 500 : 1;
      let stepConverged = false;

      for (let subiter = 0; subiter < maxSubIter; subiter++) {
        this.subIterations = subiter;
        this.converged = true;

        copyVector(this.origRightSide, this.circuitRightSide, this.circuitMatrixSize);
        if (this.circuitNonLinear) {
          copyMatrix(this.origMatrix, this.circuitMatrix, this.circuitMatrixSize);
        }

        for (const ce of this.elements) {
          if (ce instanceof WireElement) continue;
          ce.doStep(this);
        }

        if (this.stopMessage) {
          success = false;
          break;
        }

        if (!this.isMatrixValid()) {
          success = false;
          break;
        }

        if (this.circuitNonLinear) {
          if (!luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
            this.stop('Singular matrix!');
            success = false;
            break;
          }
        }

        luSolve(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute, this.circuitRightSide);
        
        copyVector(this.nodeVoltages, this.prevNodeVoltages, this.nodeVoltages.length);
        this.applySolvedRightSide(this.circuitRightSide);

        if (this.circuitNonLinear) {
          let maxDiff = 0;
          for (let j = 0; j < this.nodeVoltages.length; j++) {
            maxDiff = Math.max(maxDiff, Math.abs(this.nodeVoltages[j] - this.prevNodeVoltages[j]));
          }
          if (maxDiff < 1e-6 && subiter > 0) {
            stepConverged = true;
            break;
          }
        } else {
          stepConverged = true;
          break;
        }
      }

      if (this.circuitNonLinear && !stepConverged) {
        success = false;
        break;
      }

      if (!success) break;
    }

    const solvedVoltages = new Float64Array(this.nodeVoltages.length);
    if (success) {
      copyVector(this.nodeVoltages, solvedVoltages, this.nodeVoltages.length);
    }

    this.isDCOperatingPoint = oldDCOp;
    this.isACSweep = oldACSweep;
    this.timeStep = oldTimeStep;
    this.isBackwardEuler = oldBackwardEuler;
    this.homotopyScale = undefined;

    this.stampCircuit();

    if (!success) {
      copyVector(savedVoltages, this.nodeVoltages, this.nodeVoltages.length);
      for (const state of savedElementStates) {
        const ce = state.element;
        if (ce.volts && state.volts) {
          for (let i = 0; i < ce.volts.length; i++) {
            ce.volts[i] = state.volts[i];
          }
        }
        (ce as any).current = state.current;
        if ((ce as any).vdio !== undefined) (ce as any).vdio = state.vdio;
        if ((ce as any).lastvoltdiff !== undefined) (ce as any).lastvoltdiff = state.lastvoltdiff;
        if ((ce as any).lastGeq !== undefined) (ce as any).lastGeq = state.lastGeq;
        if ((ce as any).lastIeq !== undefined) (ce as any).lastIeq = state.lastIeq;
        if ((ce as any).lastVbe !== undefined) (ce as any).lastVbe = state.lastVbe;
        if ((ce as any).lastVbc !== undefined) (ce as any).lastVbc = state.lastVbc;
        if ((ce as any).currentSourceValue !== undefined) (ce as any).currentSourceValue = state.currentSourceValue;
      }
      return false;
    }

    copyVector(solvedVoltages, this.nodeVoltages, this.nodeVoltages.length);

    for (const ce of this.elements) ce.stepFinished();
    this.calcWireCurrents();
    copyVector(this.nodeVoltages, this.lastNodeVoltages, this.nodeVoltages.length);

    return true;
  }

  private runSubIteration(subiter: number, captureTelemetry: boolean): boolean {
    this.subIterations = subiter;
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
    if (!this.isMatrixValid()) {
      return false;
    }

    // Capture telemetry before factorization
    if (captureTelemetry) {
      if (this.circuitNonLinear) {
        this.lastG = new Float64Array(this.circuitMatrix);
      } else {
        this.lastG = new Float64Array(this.origMatrix);
      }
      this.lastI = Array.from(this.circuitRightSide);
    }

    // Factor and solve
    if (this.circuitNonLinear) {
      if (!luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
        this.stop('Singular matrix!');
        return false;
      }
    }

    luSolve(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute, this.circuitRightSide);
    if (captureTelemetry) {
      this.lastV = Array.from(this.circuitRightSide);
    }
    this.applySolvedRightSide(this.circuitRightSide);

    return true;
  }

  private isMatrixValid(): boolean {
    for (let j = 0; j < this.circuitMatrixSize; j++) {
      for (let i = 0; i < this.circuitMatrixSize; i++) {
        const x = this.circuitMatrix[i * this.circuitMatrixSize + j];
        if (isNaN(x) || !isFinite(x)) {
          this.stop('NaN/infinite matrix!');
          return false;
        }
      }
    }
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
        // Keep subIterations at its actual value for debugging/telemetry
        // rather than zeroing it out - this preserves the iteration count
        // where NaN was detected
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
        const elm = this.elementMap.get(link.elmId);
        if (elm) elm.setNodeVoltage(link.num, this.nodeVoltages[j]);
      }
    }
  }

  private calcWireCurrents(): void {
    if (!this._wireForest || !this._wireNodesData) return;
    const forest = this._wireForest;
    const wireNodesData = this._wireNodesData;

    // Post-order traversal to compute currents from leaves up to roots
    const postOrderList: WireTreeNode[] = [];
    for (const tree of forest) {
      const visitStack: { node: WireTreeNode; childIndex: number }[] = [
        { node: tree, childIndex: 0 }
      ];
      while (visitStack.length > 0) {
        const top = visitStack[visitStack.length - 1];
        if (top.childIndex < top.node.children.length) {
          const nextChild = top.node.children[top.childIndex];
          top.childIndex++;
          visitStack.push({ node: nextChild, childIndex: 0 });
        } else {
          postOrderList.push(top.node);
          visitStack.pop();
        }
      }
    }

    const nodeCurrents = new Map<WireTreeNode, number>();

    for (const node of postOrderList) {
      let totalCurrent = 0;
      const data = wireNodesData.get(node.node);
      if (data) {
        for (const contributor of data.nonWireContributors) {
          totalCurrent += contributor.element.getCurrentIntoNode(contributor.post);
        }
      }

      for (const child of node.children) {
        totalCurrent += nodeCurrents.get(child) || 0;
      }

      nodeCurrents.set(node, totalCurrent);

      if (node.edgeToParent) {
        // The current flowing *into* the treeNode from its subtree must flow *out* through the edgeToParent.
        // If the edge points towards the parent (isForward=false), current is positive.
        // If the edge points away from the parent (isForward=true), current is negative.
        if (node.edgeToParent.isForward) {
          node.edgeToParent.wire.current = -totalCurrent;
        } else {
          node.edgeToParent.wire.current = totalCurrent;
        }
      }
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
    return this.elementMap.get(id);
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