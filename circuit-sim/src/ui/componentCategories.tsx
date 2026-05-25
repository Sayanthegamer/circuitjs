import React from 'react';
import {
  Minus,
  Activity,
  Battery,
  ArrowDownToLine,
  Zap,
  ChevronRight,
  Cpu,
} from 'lucide-react';
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

export const CATEGORIES: Category[] = [
  {
    id: 'basic',
    name: 'Basic Components',
    isOpen: true,
    items: [
      { mode: 'wire', label: 'Wire', icon: <Minus size={16} />, desc: 'Ideal conductor' },
      { mode: 'resistor', label: 'Resistor', icon: <Activity size={16} />, desc: 'Limits current flow' },
      { mode: 'switch', label: 'Switch', icon: <Minus size={16} className="skew-x-12" />, desc: 'SPST switch' },
      { mode: 'ground', label: 'Ground', icon: <ArrowDownToLine size={16} />, desc: '0V reference node' },
    ]
  },
  {
    id: 'sources',
    name: 'Sources',
    isOpen: true,
    items: [
      { mode: 'voltage', label: 'DC Voltage', icon: <Battery size={16} />, desc: 'Constant voltage source' },
      { mode: 'current_source', label: 'Current Source', icon: <Activity size={16} className="rotate-90" />, desc: 'Constant current source' },
    ]
  },
  {
    id: 'passive',
    name: 'Passive Components',
    isOpen: true,
    items: [
      { mode: 'capacitor', label: 'Capacitor', icon: <Minus size={16} className="rotate-90" />, desc: 'Stores charge' },
      { mode: 'inductor', label: 'Inductor', icon: <Activity size={16} />, desc: 'Stores flux' },
      { mode: 'transformer', label: 'Transformer', icon: <Zap size={16} className="rotate-90" />, desc: 'Coupled primary/secondary windings' },
    ]
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    isOpen: true,
    items: [
      { mode: 'diode', label: 'Diode', icon: <ChevronRight size={16} />, desc: 'One-way current' },
      { mode: 'led', label: 'LED', icon: <Zap size={16} />, desc: 'Light-emitting diode' },
      { mode: 'bjt', label: 'BJT Transistor', icon: <ChevronRight size={16} className="rotate-90" />, desc: 'NPN active transistor' },
    ]
  },
  {
    id: 'digital',
    name: 'Digital Logic',
    isOpen: true,
    items: [
      { mode: 'and', label: 'AND Gate', icon: <Cpu size={16} />, desc: 'Logical AND gate' },
      { mode: 'or', label: 'OR Gate', icon: <Cpu size={16} />, desc: 'Logical OR gate' },
      { mode: 'not', label: 'NOT Gate', icon: <Cpu size={16} />, desc: 'Logical NOT gate' },
    ]
  }
];