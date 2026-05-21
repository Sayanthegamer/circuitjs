import React, { useEffect, useRef, useState } from 'react';

interface MatrixProps {
  data: number[][] | number[];
  label: string;
  precision?: number;
  highlightChanges?: boolean;
}

const MatrixCell: React.FC<{ value: number; precision: number; highlight: boolean }> = ({ value, precision, highlight }) => {
  const [isFlash, setIsFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (highlight && Math.abs(value - prevValue.current) > 1e-6) {
      setIsFlash(true);
      const timer = setTimeout(() => setIsFlash(false), 400);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value, highlight]);

  return (
    <div className={`
      font-mono text-[10px] md:text-[11px] p-1.5 min-w-[60px] text-right transition-colors duration-300
      ${isFlash ? 'text-primary font-bold bg-primary/10' : 'text-text-secondary'}
    `}>
      {value.toFixed(precision)}
    </div>
  );
};

const MatrixInspector: React.FC<MatrixProps> = ({ data, label, precision = 3, highlightChanges = true }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-2 group min-w-[120px]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">
            {label}
          </span>
        </div>
        <div className="px-3 py-4 text-center border border-dashed border-border-hairline rounded-sm text-text-muted text-[10px] italic">
          Matrix too large to display
        </div>
      </div>
    );
  }

  const isVector = !Array.isArray(data[0]);
  const rows = isVector ? (data as number[]).length : (data as number[][]).length;
  const cols = isVector ? 1 : (data as number[][])[0].length;

  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">
          {label} <span className="opacity-50 text-[8px]">({rows}×{cols})</span>
        </span>
      </div>
      
      <div className="relative inline-block">
        {/* Left Bracket */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] border-l-2 border-t-2 border-b-2 border-border-strong rounded-l-sm"></div>
        
        <div className="px-3 py-2 overflow-x-auto no-scrollbar">
          <div className="grid gap-px bg-border-hairline/20" style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(max-content, 1fr))` 
          }}>
            {isVector ? (
              (data as number[]).map((val, idx) => (
                <MatrixCell key={idx} value={val} precision={precision} highlight={highlightChanges} />
              ))
            ) : (
              (data as number[][]).map((row, rIdx) => (
                row.map((val, cIdx) => (
                  <MatrixCell key={`${rIdx}-${cIdx}`} value={val} precision={precision} highlight={highlightChanges} />
                ))
              ))
            )}
          </div>
        </div>

        {/* Right Bracket */}
        <div className="absolute right-0 top-0 bottom-0 w-[2px] border-r-2 border-t-2 border-b-2 border-border-strong rounded-r-sm"></div>
      </div>
    </div>
  );
};

/**
 * Figure 1.2: The Full MNA System Solver State
 */
export const SolverMatrixSystem: React.FC<{ G: number[][], v: number[], i: number[] }> = ({ G, v, i }) => {
  return (
    <div className="my-8 p-6 bg-surface-dim border border-border-hairline rounded-sm shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">Figure 1.2: Live MNA System State</h4>
      </div>

      <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
        <MatrixInspector data={G} label="[G] Conductance" />
        <div className="text-xl font-light text-text-muted mx-2">×</div>
        <MatrixInspector data={v} label="[v] Voltages" />
        <div className="text-xl font-light text-text-muted mx-2">=</div>
        <MatrixInspector data={i} label="[i] Sources" />
      </div>

      <div className="mt-6 pt-4 border-t border-border-hairline flex justify-between items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-primary/20 border border-primary/40"></div>
            <span className="text-[8px] text-text-muted uppercase font-bold">Linear Convergence</span>
          </div>
        </div>
        <span className="text-[8px] font-mono text-primary/60 tracking-tighter uppercase">Status: Solving_Iterative</span>
      </div>
    </div>
  );
};

export default MatrixInspector;
