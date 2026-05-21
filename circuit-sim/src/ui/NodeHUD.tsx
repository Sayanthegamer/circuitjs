import React from 'react';
import { useUIStore } from '../stores/uiStore';

const NodeHUD: React.FC = () => {
  const elm = useUIStore((s) => s.hoveredElm);
  const position = useUIStore((s) => s.mousePos);

  if (!elm) return null;

  // Formatting helper for engineering notation
  const formatVal = (val: number, unit: string) => {
    const absVal = Math.abs(val);
    if (absVal >= 1) return `${val.toFixed(2)}${unit}`;
    if (absVal >= 1e-3) return `${(val * 1e3).toFixed(2)}m${unit}`;
    if (absVal >= 1e-6) return `${(val * 1e6).toFixed(2)}μ${unit}`;
    return `${val.toExponential(2)}${unit}`;
  };

  const v1 = elm.volts && elm.volts.length > 0 ? elm.volts[0] : 0;
  const v2 = elm.volts && elm.volts.length > 1 ? elm.volts[1] : 0;
  const vDiff = typeof elm.getVoltageDiff === 'function' ? elm.getVoltageDiff() : (v1 - v2);
  const current = typeof elm.getCurrent === 'function' ? elm.getCurrent() : 0;

  return (
    <div 
      className="fixed z-[100] pointer-events-none transition-all duration-75 ease-out"
      style={{ 
        left: position.x + 16, 
        top: position.y + 16,
      }}
    >
      <div className="bg-surface-panel/90 backdrop-blur-md border border-border-hairline rounded shadow-2xl overflow-hidden min-w-[180px]">
        {/* HUD Header */}
        <div className="px-3 py-1.5 bg-surface-bright/50 border-b border-border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary">
              {elm.type} <span className="text-primary">[{elm.id}]</span>
            </span>
          </div>
          <span className="text-[8px] font-mono text-text-muted">LIVE_DATA</span>
        </div>

        {/* Data Grid */}
        <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[8px] text-text-muted uppercase font-bold tracking-tighter mb-0.5">V_node1</span>
            <span className="font-mono text-[11px] text-instrument-voltage font-bold tabular-nums">
              {formatVal(v1, 'V')}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] text-text-muted uppercase font-bold tracking-tighter mb-0.5">V_node2</span>
            <span className="font-mono text-[11px] text-instrument-voltage font-bold tabular-nums">
              {formatVal(v2, 'V')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-text-muted uppercase font-bold tracking-tighter mb-0.5">Delta_V</span>
            <span className="font-mono text-[11px] text-text-primary font-bold tabular-nums">
              {formatVal(vDiff, 'V')}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] text-text-muted uppercase font-bold tracking-tighter mb-0.5">Current</span>
            <span className="font-mono text-[11px] text-instrument-current font-bold tabular-nums">
              {formatVal(current, 'A')}
            </span>
          </div>
        </div>

        {/* Footer/Status */}
        <div className="px-3 py-1 bg-primary/5 flex justify-between items-center">
          <div className="h-[2px] flex-1 bg-border-hairline relative overflow-hidden mr-3">
            <div className="absolute inset-0 bg-primary/40 animate-shimmer" style={{ width: '40%' }}></div>
          </div>
          <span className="text-[7px] font-mono text-primary/80 uppercase">Simulating_Step</span>
        </div>
      </div>
      
      {/* Target Reticle Element */}
      <div className="absolute -left-4 -top-4 w-4 h-4 border-l border-t border-primary/50 pointer-events-none"></div>
    </div>
  );
};

export default NodeHUD;
