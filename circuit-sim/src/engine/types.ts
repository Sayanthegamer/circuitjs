// ============================================================
// Core Types for the Circuit Simulation Engine
// ============================================================

/** A 2D point on the circuit grid */
export interface Point {
  x: number;
  y: number;
}

/** Unique identifier for elements */
export type ElementId = string;

/** Link between a circuit node and an element's post */
export interface CircuitNodeLink {
  /** Index of the post on the element */
  num: number;
  /** The element this link belongs to */
  elmId: ElementId;
}

/** A node in the circuit graph (shared voltage point) */
export interface CircuitNode {
  links: CircuitNodeLink[];
  internal: boolean;
}

/** Metadata about a matrix row for simplification */
export interface RowInfo {
  type: RowInfoType;
  mapRow: number;
  mapCol: number;
  value: number;
  rsChanges: boolean;
  lsChanges: boolean;
  dropRow: boolean;
}

export const RowInfoType = {
  ROW_NORMAL: 0,
  ROW_CONST: 1,
  ROW_EQUAL: 2,
} as const;

export type RowInfoType = typeof RowInfoType[keyof typeof RowInfoType];

/** Interface every circuit element must implement */
export interface ICircuitElement {
  id: ElementId;
  x: number;
  y: number;
  x2: number;
  y2: number;
  type: string;

  /** Number of external connection posts */
  getPostCount(): number;

  /** Get the (x,y) position of post n */
  getPost(n: number): Point;

  /** Number of internal nodes (beyond posts) */
  getInternalNodeCount(): number;

  /** Number of voltage sources this element introduces */
  getVoltageSourceCount(): number;

  /** Assign node index to post/internal-node j */
  setNode(j: number, nodeIndex: number): void;

  /** Get the node index for post/internal-node j */
  getNode(j: number): number;

  /** Stamp this element's linear contribution into the matrix */
  stamp(stamper: IStamper): void;

  /** Stamp nonlinear contributions during Newton-Raphson iteration */
  doStep(stamper: IStamper): void;

  /** Called at the start of each timestep iteration */
  startIteration(): void;

  /** Called after a timestep has converged */
  stepFinished(): void;

  /** Set a node voltage after solving */
  setNodeVoltage(n: number, v: number): void;

  /** Set current through a voltage source */
  setCurrent(vsIndex: number, current: number): void;

  /** Get the voltage source index */
  getVoltageSource(): number;
  setVoltageSource(j: number, vs: number): void;

  /** Reset element to initial state */
  reset(): void;

  /** Is this element nonlinear? */
  nonLinear(): boolean;

  /** Is this element a wire? */
  isWire(): boolean;

  /** Get current flowing through the element */
  getCurrent(): number;

  /** Calculate current from node voltages */
  calculateCurrent(): void;

  /** Get number of connection nodes for topology analysis */
  getConnectionNodeCount(): number;

  /** Get node index for connection node j */
  getConnectionNode(j: number): number;

  /** Are posts n1 and n2 connected through this element? */
  getConnection(n1: number, n2: number): boolean;

  /** Does post n have a ground connection? */
  hasGroundConnection(n: number): boolean;

  /** Get current flowing into node n */
  getCurrentIntoNode(n: number): number;

  /** Get voltage difference across element */
  getVoltageDiff(): number;

  /** Node voltages array */
  volts: number[];

  /** Node indices array */
  nodes: number[];
}

/** Interface for stamping values into the MNA matrix */
export interface IStamper {
  stampMatrix(i: number, j: number, x: number): void;
  stampRightSide(i: number, x?: number): void;
  stampResistor(n1: number, n2: number, r: number): void;
  stampConductance(n1: number, n2: number, g: number): void;
  stampVoltageSource(n1: number, n2: number, vs: number, v?: number): void;
  stampCurrentSource(n1: number, n2: number, i: number): void;
  stampNonLinear(i: number): void;
  updateVoltageSource(n1: number, n2: number, vs: number, v: number): void;
  nodeCount: number;
  t: number;
  timeStep: number;
  converged: boolean;
  subIterations: number;
}

export interface SimulationState {
  t: number;
  timeStep: number;
  nodeVoltages: number[];
  elementStates: ElementState[];
  converged: boolean;
  fps: number;
  stepsPerSec: number;
  stopMessage: string | null;
}

export interface ElementState {
  id: ElementId;
  volts: number[];
  current: number;
  power: number;
}
