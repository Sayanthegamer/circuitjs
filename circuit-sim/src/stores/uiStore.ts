// ============================================================
// UI Store — Tool Mode, Selection, Placement, View, Hover
// ============================================================

import { create } from 'zustand';
import type { ICircuitElement } from '../engine/types';

export type ToolMode = 'select' | 'wire' | 'resistor' | 'voltage' | 'ground' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'led' | 'bjt' | 'current_source' | 'and' | 'or' | 'not' | 'transformer';

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
  selectedIds: string[];
  selectionBox: { x1: number; y1: number; x2: number; y2: number } | null;
  placing: PlacingState | null;
  viewMode: 'workspace' | 'whitepaper';
  showValues: boolean;

  // Hover state — subscribed to only by NodeHUD, not the whole App
  hoveredElm: ICircuitElement | null;
  hoveredNode: number | null;

  draggingElmId: string | null;
  draggingNode: number | null;

  // Plotter state
  plotterMinimized: boolean;

  // Mobile panel open/close state
  mobilePaletteOpen: boolean;
  mobilePropertiesOpen: boolean;
  mobileMenuOpen: boolean;

  // Mobile Unified Bottom Dock state
  activeMobileTab: 'palette' | 'properties' | 'scope' | 'solver';
  mobileDockHeight: 'collapsed' | 'medium' | 'expanded';

  // Actions
  setTool: (t: ToolMode) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectionBox: (box: { x1: number; y1: number; x2: number; y2: number } | null) => void;
  setPlacing: (p: PlacingState | null) => void;
  setViewMode: (m: 'workspace' | 'whitepaper') => void;
  setShowValues: (s: boolean) => void;
  setHoveredElm: (elm: ICircuitElement | null) => void;
  setHoveredNode: (node: number | null) => void;
  setDraggingState: (elmId: string | null, node: number | null) => void;
  
  setPlotterMinimized: (m: boolean) => void;
  setMobilePaletteOpen: (open: boolean) => void;
  setMobilePropertiesOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveMobileTab: (tab: 'palette' | 'properties' | 'scope' | 'solver') => void;
  setMobileDockHeight: (height: 'collapsed' | 'medium' | 'expanded') => void;
}

export const lastMousePos = { x: 0, y: 0 };

export const useUIStore = create<UIState>((set) => ({
  tool: 'select',
  selectedId: null,
  selectedIds: [],
  selectionBox: null,
  placing: null,
  viewMode: 'workspace',
  showValues: true,
  hoveredElm: null,
  hoveredNode: null,

  draggingElmId: null,
  draggingNode: null,
  
  plotterMinimized: true,
  mobilePaletteOpen: false,
  mobilePropertiesOpen: false,
  mobileMenuOpen: false,
  
  activeMobileTab: 'palette',
  mobileDockHeight: 'collapsed',

  setTool: (t) => set({ tool: t }),
  setSelectedId: (id) => set(() => {
    // Auto-open Properties tab when selecting an element on mobile
    const updates: Partial<UIState> = { selectedId: id, selectedIds: id ? [id] : [] };
    if (id) {
      updates.activeMobileTab = 'properties';
      updates.mobileDockHeight = 'medium';
    }
    return updates;
  }),
  setSelectedIds: (ids) => set({ selectedIds: ids, selectedId: ids.length > 0 ? ids[ids.length - 1] : null }),
  setSelectionBox: (box) => set({ selectionBox: box }),
  setPlacing: (p) => set({ placing: p }),
  setViewMode: (m) => set({ viewMode: m }),
  setShowValues: (s) => set({ showValues: s }),
  setHoveredElm: (elm) => set({ hoveredElm: elm }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setDraggingState: (elmId, node) => set({ draggingElmId: elmId, draggingNode: node }),
  
  setPlotterMinimized: (m) => set({ plotterMinimized: m }),
  setMobilePaletteOpen: (open) => set({ mobilePaletteOpen: open }),
  setMobilePropertiesOpen: (open) => set({ mobilePropertiesOpen: open }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),
  setMobileDockHeight: (height) => set({ mobileDockHeight: height }),
}));