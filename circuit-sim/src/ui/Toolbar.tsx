import React from 'react';
import {
  MousePointer2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  List,
  Undo,
  Redo,
  Download,
  Upload,
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
  const undoStack = useCircuitStore((s) => s.undoStack);
  const redoStack = useCircuitStore((s) => s.redoStack);

  const selectTool = (mode: ToolMode) => {
    setTool(mode);
  };

  const handleReset = () => {
    useCircuitStore.getState().resetSim();
  };

  const handleDelete = () => {
    if (selectedId) {
      const { circuit, pushHistory, saveToLocalStorage } = useCircuitStore.getState();
      pushHistory();
      circuit.removeElement(selectedId);
      circuit.analyzeCircuit();
      saveToLocalStorage();
      setSelectedId(null);
    }
  };

  const handleUndo = () => {
    useCircuitStore.getState().undo();
  };

  const handleRedo = () => {
    useCircuitStore.getState().redo();
  };

  const handleExport = () => {
    const jsonStr = useCircuitStore.getState().exportToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (typeof result === 'string') {
        const success = useCircuitStore.getState().importFromJson(result);
        if (!success) {
          alert('Failed to import circuit. Please check the JSON format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            className={`p-1.5 transition-all focus:outline-none rounded-none cursor-pointer ${simRunning ? 'text-primary' : 'text-text-secondary hover:bg-surface-bright/50'}`}
            title={simRunning ? "Pause (Space)" : "Run (Space)"}
          >
            {simRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-text-secondary hover:bg-surface-bright/50 transition-colors focus:outline-none rounded-none cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className={`p-1.5 transition-colors focus:outline-none rounded-none ${selectedId ? 'text-voltage-neg hover:bg-surface-bright/50 cursor-pointer' : 'text-text-muted opacity-40 cursor-not-allowed'}`}
            title="Delete Selected Component (Del)"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setShowValues(!showValues)}
            className={`p-1.5 transition-colors focus:outline-none rounded-none cursor-pointer ${showValues ? 'text-primary bg-surface-bright' : 'text-text-secondary hover:bg-surface-bright/50'}`}
            title="Toggle Value Labels"
          >
            <List size={14} />
          </button>
        </div>

        {/* Undo/Redo Controls */}
        <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`p-1.5 transition-colors focus:outline-none rounded-none ${undoStack.length > 0 ? 'text-text-secondary hover:bg-surface-bright/50 cursor-pointer' : 'text-text-muted opacity-40 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={`p-1.5 transition-colors focus:outline-none rounded-none ${redoStack.length > 0 ? 'text-text-secondary hover:bg-surface-bright/50 cursor-pointer' : 'text-text-muted opacity-40 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={14} />
          </button>
        </div>

        {/* Serialization Controls */}
        <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
          <button
            onClick={handleExport}
            className="p-1.5 text-text-secondary hover:bg-surface-bright/50 transition-colors focus:outline-none rounded-none cursor-pointer"
            title="Export Circuit (JSON)"
          >
            <Download size={14} />
          </button>
          <label
            className="p-1.5 text-text-secondary hover:bg-surface-bright/50 transition-colors focus:outline-none rounded-none cursor-pointer flex items-center justify-center"
            title="Import Circuit (JSON)"
          >
            <Upload size={14} />
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
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
