import React from 'react';
import { useCircuitStore } from '../stores/circuitStore';

export const CanvasOverlayHUD: React.FC = () => {
  const simRunning = useCircuitStore((s) => s.simRunning);
  const stepsPerFrame = useCircuitStore((s) => s.stepsPerFrame);

  return (
    <div className="absolute top-6 left-6 pointer-events-none">
      <div className="bg-surface-dim/85 backdrop-blur-md border border-border-hairline p-3 rounded-none text-[10px] font-mono flex flex-col gap-2 min-w-[145px]">
        <div className="flex justify-between border-b border-border-hairline pb-1">
          <span className="text-text-muted">ENGINE_STATUS</span>
          <span className="text-instrument-current font-bold">{simRunning ? 'RUNNING' : 'PAUSED'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">TIME_STEP</span>
          <span className="text-text-secondary">0.001s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">SOLVER_METH</span>
          <span className="text-text-secondary">TRAPEZOIDAL</span>
        </div>
        {stepsPerFrame > 0 && (
          <div className="flex justify-between">
            <span className="text-text-muted">SOLVER_STEPS</span>
            <span className="text-instrument-voltage font-bold">{stepsPerFrame}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasOverlayHUD;
