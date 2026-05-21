import React from 'react';
import {
  MousePointer2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  List,
} from 'lucide-react';
import { useUIStore, type ToolMode } from '../stores/uiStore';
import { useCircuitStore } from '../stores/circuitStore';

export const Toolbar: React.FC = () => {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const showValues = useUIStore((s) => s.showValues);
  const setShowValues = useUIStore((s) => s.setShowValues);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const simRunning = useCircuitStore((s) => s.simRunning);
  const setSimRunning = useCircuitStore((s) => s.setSimRunning);
  const simTime = useCircuitStore((s) => s.simTime);
  const stopMessage = useCircuitStore((s) => s.stopMessage);

  const selectTool = (mode: ToolMode) => {
    setTool(mode);
  };

  const handleReset = () => {
    useCircuitStore.getState().resetSim();
  };

  const handleDelete = () => {
    if (selectedId) {
      const { circuit } = useCircuitStore.getState();
      circuit.removeElement(selectedId);
      circuit.analyzeCircuit();
      setSelectedId(null);
    }
  };

  return (
    <header className="h-[46px] bg-surface-toolbar border-b border-border-hairline fixed top-0 w-full z-50 flex items-center justify-between px-4 select-none">
      {/* Brand Logo & View Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-none flex items-center justify-center">
            <div className="w-2.5 h-2.5 border-2 border-white rotate-45"></div>
          </div>
          <span className="font-bold tracking-tight text-text-primary text-sm font-sans">CircuitSim</span>
          <span className="text-[9px] font-mono text-text-muted bg-surface-bright/50 px-1.5 py-0.5 rounded-none border border-border-hairline">v1.0.4-alpha</span>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
          <button
            onClick={() => setViewMode('workspace')}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
              viewMode === 'workspace'
                ? 'bg-surface-bright text-primary font-bold'
                : 'text-text-secondary hover:bg-surface-bright/50'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setViewMode('whitepaper')}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
              viewMode === 'whitepaper'
                ? 'bg-surface-bright text-primary font-bold'
                : 'text-text-secondary hover:bg-surface-bright/50'
            }`}
          >
            Whitepaper
          </button>
        </div>
      </div>

      {/* Quick Tool Selection */}
      <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
        <button
          onClick={() => selectTool('select')}
          className={`p-1.5 transition-all focus:outline-none rounded-none ${tool === 'select' ? 'bg-surface-bright text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
          title="Select (S)"
        >
          <MousePointer2 size={14} />
        </button>
        <button
          onClick={() => selectTool('wire')}
          className={`p-1.5 transition-all focus:outline-none rounded-none ${tool === 'wire' ? 'bg-surface-bright text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
          title="Wire (W)"
        >
          <span className="text-[10px] font-bold font-mono">W</span>
        </button>
        <button
          onClick={() => selectTool('resistor')}
          className={`p-1.5 transition-all focus:outline-none rounded-none ${tool === 'resistor' ? 'bg-surface-bright text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
          title="Resistor (R)"
        >
          <span className="text-[10px] font-bold font-mono">R</span>
        </button>
        <button
          onClick={() => selectTool('voltage')}
          className={`p-1.5 transition-all focus:outline-none rounded-none ${tool === 'voltage' ? 'bg-surface-bright text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
          title="DC Voltage (V)"
        >
          <span className="text-[10px] font-bold font-mono">V</span>
        </button>
        <button
          onClick={() => selectTool('ground')}
          className={`p-1.5 transition-all focus:outline-none rounded-none ${tool === 'ground' ? 'bg-surface-bright text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
          title="Ground (G)"
        >
          <span className="text-[10px] font-bold font-mono">G</span>
        </button>
      </div>

      {/* Simulator Controls & Telemetry */}
      <div className="flex items-center gap-4">
        {/* Play/Pause/Reset Controls */}
        <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
          <button
            onClick={() => setSimRunning(!simRunning)}
            className={`p-1.5 transition-all focus:outline-none rounded-none ${simRunning ? 'text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
            title={simRunning ? "Pause (Space)" : "Run (Space)"}
          >
            {simRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-text-secondary hover:bg-surface-bright/50 transition-colors focus:outline-none rounded-none"
            title="Reset Simulation"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className={`p-1.5 transition-colors focus:outline-none rounded-none ${selectedId ? 'text-voltage-neg hover:bg-surface-bright/50' : 'text-text-muted opacity-40 cursor-not-allowed'}`}
            title="Delete Selected Component (Del)"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setShowValues(!showValues)}
            className={`p-1.5 transition-colors focus:outline-none rounded-none ${showValues ? 'text-primary bg-surface-bright' : 'text-text-secondary hover:bg-surface-bright/50'}`}
            title="Toggle Value Labels"
          >
            <List size={14} />
          </button>
        </div>

        {/* Engine Telemetry */}
        <div className="flex items-center gap-4 border-l border-border-hairline pl-4">
          {stopMessage ? (
            <div className="flex items-center gap-1.5 text-voltage-neg" title={stopMessage}>
              <span className="w-1.5 h-1.5 rounded-full bg-voltage-neg animate-pulse"></span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:inline">Error: {stopMessage.substring(0, 15)}{stopMessage.length > 15 ? '...' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-instrument-current animate-pulse' : 'bg-text-muted'}`}></div>
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider hidden sm:inline">{simRunning ? 'Engine Active' : 'Engine Idle'}</span>
            </div>
          )}

          <div className="font-mono text-xs text-instrument-current font-bold tabular-nums">
            <span className="text-text-muted opacity-50 mr-1 text-[10px]">T_SIM:</span>
            {simTime.toFixed(2)}ms
          </div>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
