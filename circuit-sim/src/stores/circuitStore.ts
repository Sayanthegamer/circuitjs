// ============================================================
// Circuit Store — Engine, Simulation, Telemetry, Probes
// ============================================================

import { create } from 'zustand';
import { Circuit } from '../engine';
import { Camera } from '../renderer/camera';
import type { ProbedItem, PlotterHandle } from '../ui/Plotter';

export interface TelemetryPayload {
  matrixG: number[][];
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
  matrixG: number[][];
  vectorV: number[];
  vectorI: number[];
  nrErrors: number[];

  // Probed items for oscilloscope
  probedItems: ProbedItem[];

  // Plotter imperative handle ref (used by rAF loop to push data)
  plotterRef: { current: PlotterHandle | null };

  // Actions
  setSimRunning: (r: boolean) => void;
  toggleSimRunning: () => void;
  updateTelemetry: (data: TelemetryPayload) => void;
  setProbedItems: (items: ProbedItem[]) => void;
  resetSim: () => void;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: new Circuit(),
  camera: new Camera(),

  simRunning: true,
  simTime: 0,
  stepsPerFrame: 0,
  stopMessage: null,

  matrixG: [[0]],
  vectorV: [],
  vectorI: [],
  nrErrors: [],

  probedItems: [],
  plotterRef: { current: null },

  setSimRunning: (r) => set({ simRunning: r }),
  toggleSimRunning: () => set((s) => ({ simRunning: !s.simRunning })),

  updateTelemetry: (data) => set({
    matrixG: data.matrixG,
    vectorV: data.vectorV,
    vectorI: data.vectorI,
    nrErrors: data.nrErrors,
    simTime: data.simTime,
    stepsPerFrame: data.stepsPerFrame,
    stopMessage: data.stopMessage,
  }),

  setProbedItems: (items) => set({ probedItems: items }),

  resetSim: () => {
    get().circuit.reset();
    set({ simTime: 0, stopMessage: null });
  },
}));
