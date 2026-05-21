import React, { useMemo } from 'react';

interface ConvergenceSparklineProps {
  errors: number[]; // Array of error values per iteration in the last frame
  maxIterations?: number;
  tolerance?: number;
}

const ConvergenceSparkline: React.FC<ConvergenceSparklineProps> = ({ 
  errors = [], 
  maxIterations = 100, 
  tolerance = 1e-6 
}) => {
  const isLinear = errors.length <= 1;
  const currentError = errors.length > 0 ? errors[errors.length - 1] : 0;
  
  // Optimization: Pre-calculate the SVG path string
  const sparklinePath = useMemo(() => {
    if (isLinear || errors.length < 2) return "";
    
    const width = 180;
    const height = 40;
    const padding = 4;
    
    // Logarithmic scaling for error visualization (since errors can span many decades)
    const logMin = Math.log10(tolerance) - 1;
    const firstError = Math.max(errors[0] || 0, 1e-12);
    let logMax = Math.max(Math.log10(firstError), logMin + 2);
    if (Math.abs(logMax - logMin) < 1e-9) {
      logMax = logMin + 1;
    }
    
    return errors.map((err, i) => {
      const x = padding + (i / (errors.length - 1)) * (width - 2 * padding);
      const logVal = Math.log10(Math.max(err, 1e-12));
      // Map log value to Y: logMax -> 0, logMin -> height
      const y = padding + ((logMax - logVal) / (logMax - logMin)) * (height - 2 * padding);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [errors, isLinear, tolerance]);

  return (
    <div className="bg-surface-dim border border-border-hairline rounded-sm p-3 min-w-[240px] flex flex-col gap-2">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isLinear ? 'bg-text-muted' : 'bg-instrument-current animate-pulse'}`}></div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Newton-Raphson Residual</span>
        </div>
        <span className="font-mono text-[9px] text-text-muted">TOL: {tolerance.toExponential(0)}</span>
      </div>

      <div className="relative h-[40px] w-full bg-surface-bright/20 rounded border border-border-hairline/50 overflow-hidden">
        {/* Horizontal Tolerance Baseline */}
        <div 
          className="absolute w-full border-t border-instrument-current/30 border-dashed z-0" 
          style={{ top: '80%' }}
        ></div>

        {errors.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[9px] text-text-muted tracking-tighter uppercase">Status: Linear_Circuit</span>
          </div>
        ) : errors.length === 1 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[9px] text-instrument-current/70 tracking-tighter uppercase">Status: Converged_Instantly (Steady State)</span>
          </div>
        ) : (
          <svg className="absolute inset-0 w-full h-full">
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={currentError <= tolerance ? "text-instrument-current" : "text-instrument-voltage"}
            />
          </svg>
        )}
      </div>

      <div className="flex justify-between items-end mt-1">
        <div className="flex flex-col">
          <span className="text-[7px] text-text-muted uppercase font-bold">Iterations</span>
          <span className="font-mono text-xs text-text-primary font-bold">
            {errors.length}<span className="text-text-muted">/{maxIterations}</span>
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[7px] text-text-muted uppercase font-bold">Final Error</span>
          <span className={`font-mono text-xs font-bold ${currentError <= tolerance ? "text-instrument-current" : "text-instrument-voltage"}`}>
            {currentError.toExponential(3)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConvergenceSparkline;
