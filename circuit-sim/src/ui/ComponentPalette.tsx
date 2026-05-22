import React, { useState, useMemo } from 'react';
import {
  Box,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useCircuitStore } from '../stores/circuitStore';
import { CATEGORIES } from './componentCategories';

export const ComponentPalette: React.FC = () => {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);

  const simRunning = useCircuitStore((s) => s.simRunning);
  const stepsPerFrame = useCircuitStore((s) => s.stepsPerFrame);
  const circuit = useCircuitStore((s) => s.circuit);
  useCircuitStore((s) => s.telemetryVersion);

  const formatTimeStep = (dt: number): string => {
    if (dt >= 1) return `${parseFloat(dt.toFixed(3))}s`;
    if (dt >= 1e-3) return `${parseFloat((dt * 1e3).toFixed(3))}ms`;
    if (dt >= 1e-6) return `${parseFloat((dt * 1e6).toFixed(3))}µs`;
    return `${parseFloat((dt * 1e9).toFixed(3))}ns`;
  };


  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(CATEGORIES);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c));
  };

  const filteredCategories = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.desc.toLowerCase().includes(lowerQuery)
      )
    })).filter(cat => cat.items.length > 0);
  }, [categories, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Palette Header */}
      <div className="p-4 border-b border-border-hairline">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold mb-3 font-mono">Palette</div>
        <div className="relative flex items-center bg-surface-dim border border-border-hairline px-2 py-1">
          <Search size={12} className="text-text-muted mr-2" />
          <input
            type="text"
            placeholder="Search parts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-text-primary placeholder-text-muted focus:outline-none font-mono"
          />
        </div>
      </div>


      {/* Simulation HUD */}
      <div className="bg-surface-dim/85 border-b border-border-hairline p-3 text-[10px] font-mono flex flex-col gap-1 w-full">
        <div className="flex justify-between border-b border-border-hairline pb-1">
          <span className="text-text-muted">STATUS</span>
          <span className="text-instrument-current font-bold">{simRunning ? 'RUN' : 'PAUSE'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">T_STEP</span>
          <span className="text-text-secondary">{formatTimeStep(circuit.maxTimeStep)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">SOLVER</span>
          <span className="text-text-secondary">{circuit.isBackwardEuler ? 'BE' : 'TRAP'}</span>
        </div>
        {stepsPerFrame > 0 && (
          <div className="flex justify-between">
            <span className="text-text-muted">STEPS</span>
            <span className="text-instrument-voltage font-bold">{stepsPerFrame}</span>
          </div>
        )}
      </div>

      {/* Palette Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="space-y-2">
            <button
              className="w-full flex items-center gap-1.5 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary focus:outline-none"
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span>{cat.name}</span>
            </button>

            {cat.isOpen && (
              <div className="grid grid-cols-2 gap-1.5">
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => setTool(item.mode)}
                    className={`flex items-center gap-2 bg-surface-dim border p-1.5 transition-all rounded-none focus:outline-none ${
                      tool === item.mode
                        ? 'border-primary bg-surface-bright text-primary font-bold shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'border-border-hairline text-text-secondary hover:border-text-secondary/50 hover:bg-surface-bright/50 hover:text-text-primary'
                    }`}
                  >
                    <div>{item.icon}</div>
                    <span className="text-[9px] font-mono tracking-wider uppercase font-bold text-left leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted gap-2">
            <Box size={20} />
            <span className="text-[9px] uppercase tracking-wider font-mono">No components</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentPalette;
