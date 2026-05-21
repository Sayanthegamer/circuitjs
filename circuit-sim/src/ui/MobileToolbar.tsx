import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  List,
  Undo,
  Redo,
  Download,
  Upload,
  Menu,
  Plus,
  X,
  Layout,
  Square,
} from 'lucide-react';
import { useUIStore, type ToolMode } from '../stores/uiStore';
import { useCircuitStore } from '../stores/circuitStore';

export const MobileToolbar: React.FC = () => {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const showValues = useUIStore((s) => s.showValues);
  const setShowValues = useUIStore((s) => s.setShowValues);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setMobilePaletteOpen = useUIStore((s) => s.setMobilePaletteOpen);
  const setMobilePropertiesOpen = useUIStore((s) => s.setMobilePropertiesOpen);

  const simRunning = useCircuitStore((s) => s.simRunning);
  const setSimRunning = useCircuitStore((s) => s.setSimRunning);
  const simTime = useCircuitStore((s) => s.simTime);
  const stopMessage = useCircuitStore((s) => s.stopMessage);
  const undoStack = useCircuitStore((s) => s.undoStack);
  const redoStack = useCircuitStore((s) => s.redoStack);

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

  const handleSelectTool = (mode: ToolMode) => {
    setTool(mode);
  };

  // Quick tool buttons for the toolbar
  const quickTools: { mode: ToolMode; label: string }[] = [
    { mode: 'select', label: 'S' },
    { mode: 'wire', label: 'W' },
    { mode: 'resistor', label: 'R' },
    { mode: 'voltage', label: 'V' },
    { mode: 'ground', label: 'G' },
  ];

  return (
    <>
      <header className="h-12 bg-surface-toolbar border-b border-border-hairline fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 select-none">
        {/* Left: Menu & Tools */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Quick Tool Buttons (visible on larger mobile) */}
          <div className="hidden sm:flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
            {quickTools.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => handleSelectTool(mode)}
                className={`w-8 h-8 flex items-center justify-center transition-all focus:outline-none rounded-none ${
                  tool === mode
                    ? 'bg-surface-bright text-primary'
                    : 'text-text-secondary hover:bg-surface-bright/50'
                }`}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
                <span className="text-[11px] font-bold font-mono">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Brand */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary flex items-center justify-center">
            <div className="w-2 h-2 border-2 border-white rotate-45"></div>
          </div>
          <span className="font-bold text-sm text-text-primary">CircuitSim</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Properties button */}
          <button
            onClick={() => setMobilePropertiesOpen(true)}
            className={`p-2 transition-colors ${selectedId ? 'text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Properties"
          >
            <List size={18} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setSimRunning(!simRunning)}
            className={`p-2 transition-colors ${simRunning ? 'text-instrument-current' : 'text-text-secondary hover:text-text-primary'}`}
            title={simRunning ? 'Pause' : 'Play'}
          >
            {simRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Add Component */}
          <button
            onClick={() => setMobilePaletteOpen(true)}
            className="p-2 bg-primary text-white hover:bg-primary/90 transition-colors"
            title="Add Component"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Dropdown Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-12 left-2 z-50 bg-surface border border-border-hairline shadow-xl min-w-[200px] animate-slide-down">
            <div className="p-3 border-b border-border-hairline bg-surface-dim">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">CircuitSim Menu</span>
            </div>
            <div className="p-2">
              {/* View Mode */}
              <div className="p-2 border-b border-border-hairline mb-2">
                <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-2">View</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setViewMode('workspace'); setMobileMenuOpen(false); }}
                    className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      viewMode === 'workspace'
                        ? 'bg-primary text-white'
                        : 'bg-surface-dim text-text-secondary hover:bg-surface-bright'
                    }`}
                  >
                    <Layout size={12} />
                    Workspace
                  </button>
                  <button
                    onClick={() => { setViewMode('whitepaper'); setMobileMenuOpen(false); }}
                    className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      viewMode === 'whitepaper'
                        ? 'bg-primary text-white'
                        : 'bg-surface-dim text-text-secondary hover:bg-surface-bright'
                    }`}
                  >
                    <Square size={12} />
                    Paper
                  </button>
                </div>
              </div>

              {/* Show Values Toggle */}
              <button
                onClick={() => { setShowValues(!showValues); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-bright/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <List size={14} />
                  <span>Show Values</span>
                </div>
                <div className={`w-4 h-4 border ${showValues ? 'bg-primary border-primary' : 'border-border-hairline'} flex items-center justify-center`}>
                  {showValues && <span className="text-[8px] text-white">✓</span>}
                </div>
              </button>

              {/* Undo/Redo */}
              <button
                onClick={() => { handleUndo(); setMobileMenuOpen(false); }}
                disabled={undoStack.length === 0}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  undoStack.length > 0
                    ? 'text-text-secondary hover:bg-surface-bright/50'
                    : 'text-text-muted opacity-50'
                }`}
              >
                <Undo size={14} />
                <span>Undo</span>
              </button>
              <button
                onClick={() => { handleRedo(); setMobileMenuOpen(false); }}
                disabled={redoStack.length === 0}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  redoStack.length > 0
                    ? 'text-text-secondary hover:bg-surface-bright/50'
                    : 'text-text-muted opacity-50'
                }`}
              >
                <Redo size={14} />
                <span>Redo</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => { handleDelete(); setMobileMenuOpen(false); }}
                disabled={!selectedId}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  selectedId
                    ? 'text-voltage-neg hover:bg-surface-bright/50'
                    : 'text-text-muted opacity-50'
                }`}
              >
                <span className="text-voltage-neg">✕</span>
                <span>Delete Selected</span>
              </button>

              {/* Reset */}
              <button
                onClick={() => { handleReset(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-bright/50 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Reset Simulation</span>
              </button>

              {/* Separator */}
              <div className="border-t border-border-hairline my-2" />

              {/* Import/Export */}
              <button
                onClick={() => { handleExport(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-bright/50 transition-colors"
              >
                <Download size={14} />
                <span>Export Circuit</span>
              </button>
              <label className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-bright/50 transition-colors cursor-pointer">
                <Upload size={14} />
                <span>Import Circuit</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => { handleImport(e); setMobileMenuOpen(false); }}
                  className="hidden"
                />
              </label>

              {/* Separator */}
              <div className="border-t border-border-hairline my-2" />

              {/* Sim Time */}
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[9px] text-text-muted font-mono">T_SIM</span>
                <span className="text-xs font-mono text-instrument-current font-bold">{simTime.toFixed(2)}ms</span>
              </div>

              {/* Error state */}
              {stopMessage && (
                <div className="px-3 py-2 flex items-center gap-2 text-voltage-neg">
                  <span className="w-1.5 h-1.5 rounded-full bg-voltage-neg animate-pulse"></span>
                  <span className="text-xs font-mono">{stopMessage.substring(0, 20)}{stopMessage.length > 20 ? '...' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};