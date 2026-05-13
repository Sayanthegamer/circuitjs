import React from 'react';
import { 
  MousePointer2, 
  Minus, 
  Activity, 
  Battery, 
  ArrowDownToLine, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2,
  List
} from 'lucide-react';
import type { ToolMode } from '../App';

interface ToolbarProps {
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
  simRunning: boolean;
  setSimRunning: (r: boolean) => void;
  handleReset: () => void;
  handleDelete: () => void;
  selectedId: string | null;
  showValues: boolean;
  setShowValues: (s: boolean) => void;
}

export function Toolbar({ 
  tool, setTool, 
  simRunning, setSimRunning, 
  handleReset, handleDelete, selectedId,
  showValues, setShowValues
}: ToolbarProps) {
  
  const tools: {mode: ToolMode, key: string, label: string, icon: React.ReactNode}[] = [
    { mode: 'select', key: 'S', label: 'Select', icon: <MousePointer2 size={16} /> },
    { mode: 'wire', key: 'W', label: 'Wire', icon: <Minus size={16} /> },
    { mode: 'resistor', key: 'R', label: 'Resistor', icon: <Activity size={16} /> },
    { mode: 'voltage', key: 'V', label: 'Voltage', icon: <Battery size={16} /> },
    { mode: 'ground', key: 'G', label: 'Ground', icon: <ArrowDownToLine size={16} /> },
  ];

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <div className="logo-box">
          <span className="logo-icon">⚡</span>
        </div>
        <span className="logo-text">CircuitSim</span>
      </div>

      <div className="toolbar-group toolbar-tools">
        {tools.map(({ mode, key, label, icon }) => (
          <button
            key={mode}
            className={`tool-btn ${tool === mode ? 'active' : ''}`}
            onClick={() => setTool(mode)}
            title={`${label} (${key})`}
          >
            <span className="tool-icon">{icon}</span>
            <span className="tool-label">{label}</span>
            <kbd>{key}</kbd>
          </button>
        ))}
      </div>

      <div className="toolbar-group toolbar-actions">
        <button
          className={`sim-btn ${simRunning ? 'running' : 'stopped'}`}
          onClick={() => setSimRunning(!simRunning)}
          title="Space to toggle"
        >
          {simRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{simRunning ? 'Pause' : 'Run'}</span>
        </button>
        <div className="divider" />
        <button className="icon-btn" onClick={handleReset} title="Reset Simulation">
          <RotateCcw size={16} />
        </button>
        <button className="icon-btn" onClick={handleDelete} title="Delete selected" disabled={!selectedId}>
          <Trash2 size={16} />
        </button>
        <button className={`icon-btn ${showValues ? 'active' : ''}`} onClick={() => setShowValues(!showValues)} title="Toggle values">
          <List size={16} />
        </button>
      </div>
    </header>
  );
}
