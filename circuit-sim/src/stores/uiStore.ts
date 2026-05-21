// ============================================================
// UI Store — Tool Mode, Selection, Placement, View, Hover
// ============================================================

import { create } from 'zustand';
import type { ICircuitElement } from '../engine/types';

export type ToolMode = 'select' | 'wire' | 'resistor' | 'voltage' | 'ground' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'led';

export interface PlacingState {
  type: ToolMode;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  phase: 'first' | 'second';
}

interface UIState {
  tool: ToolMode;
  selectedId: string | null;
  placing: PlacingState | null;
  viewMode: 'workspace' | 'whitepaper';
  showValues: boolean;

  // Hover state — subscribed to only by NodeHUD, not the whole App
  hoveredElm: ICircuitElement | null;

  // Plotter state
  plotterMinimized: boolean;

  // Mobile panel open/close state
  mobilePaletteOpen: boolean;
  mobilePropertiesOpen: boolean;
  mobileMenuOpen: boolean;

  // Actions
  setTool: (t: ToolMode) => void;
  setSelectedId: (id: string | null) => void;
  setPlacing: (p: PlacingState | null) => void;
  setViewMode: (m: 'workspace' | 'whitepaper') => void;
  setShowValues: (s: boolean) => void;
  setHoveredElm: (elm: ICircuitElement | null) => void;
  
  setPlotterMinimized: (m: boolean) => void;
  setMobilePaletteOpen: (open: boolean) => void;
  setMobilePropertiesOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const lastMousePos = { x: 0, y: 0 };

export const useUIStore = create<UIState>((set) => ({
  tool: 'select',
  selectedId: null,
  placing: null,
  viewMode: 'workspace',
  showValues: true,
  hoveredElm: null,
  
  plotterMinimized: true,
  mobilePaletteOpen: false,
  mobilePropertiesOpen: false,
  mobileMenuOpen: false,

  setTool: (t) => set({ tool: t }),
  setSelectedId: (id) => set({ selectedId: id }),
  setPlacing: (p) => set({ placing: p }),
  setViewMode: (m) => set({ viewMode: m }),
  setShowValues: (s) => set({ showValues: s }),
  setHoveredElm: (elm) => set({ hoveredElm: elm }),
  
  setPlotterMinimized: (m) => set({ plotterMinimized: m }),
  setMobilePaletteOpen: (open) => set({ mobilePaletteOpen: open }),
  setMobilePropertiesOpen: (open) => set({ mobilePropertiesOpen: open }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));