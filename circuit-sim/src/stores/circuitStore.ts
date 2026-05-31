// ============================================================
// Circuit Store — Engine, Simulation, Telemetry, Probes
// ============================================================

import { create } from 'zustand';
import { Circuit, serializeCircuit, deserializeCircuit } from '../engine';
import { Camera } from '../renderer/camera';
import type { ProbedItem, PlotterHandle } from '../ui/Plotter';
import { useUIStore } from './uiStore';

export interface TelemetryPayload {
  matrixG: number[];
  vectorV: number[];
  vectorI: number[];
  nrErrors: number[];
  simTime: number;
  stepsPerFrame: number;
  stopMessage: string | null;
}

interface CircuitState {
  // Engine instances (non-reactive — read via getState() in rAF loop)
  circuit: Circuit;
  camera: Camera;

  // Simulation control
  simRunning: boolean;
  simTime: number;
  stepsPerFrame: number;
  stopMessage: string | null;

  // Telemetry (updated at ~4Hz from the render loop)
  matrixG: number[];
  vectorV: number[];
  vectorI: number[];
  nrErrors: number[];
  telemetryVersion: number;

  // Probed items for oscilloscope
  probedItems: ProbedItem[];

  // Plotter imperative handle ref (used by rAF loop to push data)
  plotterRef: { current: PlotterHandle | null };

  // Undo / Redo stacks (serialized JSON strings of elements list)
  undoStack: string[];
  redoStack: string[];

  // Actions
  setSimRunning: (r: boolean) => void;
  toggleSimRunning: () => void;
  updateTelemetry: (data: TelemetryPayload) => void;
  setProbedItems: (items: ProbedItem[]) => void;
  resetSim: () => void;

  // Undo / Redo & Serialization actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  importFromJson: (jsonStr: string) => boolean;
  exportToJson: () => string;
  restoreLastStableConfig: () => boolean;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: new Circuit(),
  camera: new Camera(),

  simRunning: true,
  simTime: 0,
  stepsPerFrame: 0,
  stopMessage: null,

  matrixG: [0],
  vectorV: [],
  vectorI: [],
  nrErrors: [],
  telemetryVersion: 0,

  probedItems: [],
  plotterRef: { current: null },

  undoStack: [],
  redoStack: [],

  setSimRunning: (r) => set({ simRunning: r }),
  toggleSimRunning: () => set((s) => ({ simRunning: !s.simRunning })),

  updateTelemetry: (data) => set((s) => ({
    matrixG: data.matrixG,
    vectorV: data.vectorV,
    vectorI: data.vectorI,
    nrErrors: data.nrErrors,
    simTime: data.simTime,
    stepsPerFrame: data.stepsPerFrame,
    stopMessage: data.stopMessage,
    telemetryVersion: s.telemetryVersion + 1,
  })),

  setProbedItems: (items) => set({ probedItems: items }),

  resetSim: () => {
    get().pushHistory();
    get().circuit.reset();
    get().saveToLocalStorage();
    set({
      simTime: 0,
      stepsPerFrame: 0,
      stopMessage: null,
      matrixG: [0],
      vectorV: [],
      vectorI: [],
      nrErrors: [],
      telemetryVersion: 0,
    });
  },

  pushHistory: () => {
    const stateBefore = serializeCircuit(get().circuit);
    const undoStack = get().undoStack;
    // Don't push exact duplicate states consecutively
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === stateBefore) {
      return;
    }
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), stateBefore],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, circuit } = get();
    if (undoStack.length === 0) return;

    const nextUndoStack = [...undoStack];
    const prevState = nextUndoStack.pop()!;
    const currentState = serializeCircuit(circuit);

    try {
      deserializeCircuit(circuit, prevState);
      circuit.analyzeCircuit();

      const selectedId = useUIStore.getState().selectedId;
      if (selectedId && !circuit.getElement(selectedId)) {
        useUIStore.getState().setSelectedId(null);
      }

      set((s) => ({
        undoStack: nextUndoStack,
        redoStack: [...s.redoStack, currentState],
      }));
      get().saveToLocalStorage();
    } catch (e) {
      console.error('Failed to undo:', e);
    }
  },

  redo: () => {
    const { redoStack, circuit } = get();
    if (redoStack.length === 0) return;

    const nextRedoStack = [...redoStack];
    const nextState = nextRedoStack.pop()!;
    const currentState = serializeCircuit(circuit);

    try {
      deserializeCircuit(circuit, nextState);
      circuit.analyzeCircuit();

      const selectedId = useUIStore.getState().selectedId;
      if (selectedId && !circuit.getElement(selectedId)) {
        useUIStore.getState().setSelectedId(null);
      }

      set((s) => ({
        undoStack: [...s.undoStack, currentState],
        redoStack: nextRedoStack,
      }));
      get().saveToLocalStorage();
    } catch (e) {
      console.error('Failed to redo:', e);
    }
  },

  saveToLocalStorage: () => {
    try {
      const state = serializeCircuit(get().circuit);
      localStorage.setItem('circuitsim_circuit', state);
      if (get().circuit.stopMessage === null) {
        localStorage.setItem('circuitsim_stable_circuit', state);
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const state = localStorage.getItem('circuitsim_circuit');
      if (state) {
        deserializeCircuit(get().circuit, state);
        get().circuit.analyzeCircuit();
        return true;
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    return false;
  },

  importFromJson: (jsonStr) => {
    get().pushHistory();
    try {
      deserializeCircuit(get().circuit, jsonStr);
      get().circuit.analyzeCircuit();
      get().saveToLocalStorage();
      return true;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  },

  exportToJson: () => {
    return serializeCircuit(get().circuit);
  },

  restoreLastStableConfig: () => {
    try {
      const state = localStorage.getItem('circuitsim_stable_circuit');
      if (state) {
        get().pushHistory();
        deserializeCircuit(get().circuit, state);
        
        // Clear active UI selection states
        useUIStore.setState({
          selectedId: null,
          selectedIds: [],
          selectionBox: null,
          hoveredElm: null,
          hoveredNode: null,
        });

        get().circuit.stopMessage = null;
        get().circuit.analyzeCircuit();
        get().saveToLocalStorage();
        set({
          simTime: 0,
          stepsPerFrame: 0,
          stopMessage: null,
          matrixG: [0],
          vectorV: [],
          vectorI: [],
          nrErrors: [],
          telemetryVersion: get().telemetryVersion + 1,
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to restore last stable config:', e);
    }
    return false;
  },
}));
