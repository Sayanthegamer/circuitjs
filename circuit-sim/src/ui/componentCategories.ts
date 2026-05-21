import React from 'react';
import { type ToolMode } from '../stores/uiStore';

export interface CategoryItem {
  mode: ToolMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

export interface Category {
  id: string;
  name: string;
  isOpen: boolean;
  items: CategoryItem[];
}

const S16 = 16 as const;

export const CATEGORIES: Category[] = [
  {
    id: 'basic',
    name: 'Basic Components',
    isOpen: true,
    items: [
      { mode: 'wire', label: 'Wire', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })), desc: 'Ideal conductor' },
      { mode: 'resistor', label: 'Resistor', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' })), desc: 'Limits current flow' },
      { mode: 'switch', label: 'Switch', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('line', { x1: 5, y1: 12, x2: 12, y2: 12 }), React.createElement('line', { x1: 12, y1: 12, x2: 19, y2: 7 })), desc: 'SPST switch' },
      { mode: 'ground', label: 'Ground', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('line', { x1: 12, y1: 2, x2: 12, y2: 15 }), React.createElement('line', { x1: 5, y1: 15, x2: 19, y2: 15 }), React.createElement('line', { x1: 8, y1: 19, x2: 16, y2: 19 })), desc: '0V reference node' },
    ]
  },
  {
    id: 'sources',
    name: 'Sources',
    isOpen: true,
    items: [
      { mode: 'voltage', label: 'DC Voltage', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 16 }), React.createElement('line', { x1: 8, y1: 12, x2: 16, y2: 12 })), desc: 'Constant voltage source' },
    ]
  },
  {
    id: 'passive',
    name: 'Passive Components',
    isOpen: true,
    items: [
      { mode: 'capacitor', label: 'Capacitor', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('line', { x1: 8, y1: 5, x2: 8, y2: 19 }), React.createElement('line', { x1: 16, y1: 5, x2: 16, y2: 19 })), desc: 'Stores charge' },
      { mode: 'inductor', label: 'Inductor', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('path', { d: 'M4 12c0-3 2-5 4-5s4 2 4 5 2 5 4 5 4-2 4-5' })), desc: 'Stores flux' },
    ]
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    isOpen: true,
    items: [
      { mode: 'diode', label: 'Diode', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('polygon', { points: '6 4 18 12 6 20' })), desc: 'One-way current' },
      { mode: 'led', label: 'LED', icon: React.createElement('svg', { width: S16, height: S16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('polygon', { points: '6 4 18 12 6 20' }), React.createElement('circle', { cx: 6, cy: 4, r: 2, fill: 'currentColor' })), desc: 'Light-emitting diode' },
    ]
  }
];