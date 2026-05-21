import React from 'react';
import { useCircuitStore } from '../stores/circuitStore';

export const CanvasOverlayHUD: React.FC = () => {
  const simRunning = useCircuitStore((s) => s.simRunning);
  const stepsPerFrame = useCircuitStore((s) => s.stepsPerFrame);
  const circuit = useCircuitStore((s) => s.circuit);
  // Subscribe to telemetryVersion to force re-render when telemetry updates
  useCircuitStore((s) => s.telemetryVersion);

  const formatTimeStep = (dt: number): string => {
    if (dt >= 1) return `${parseFloat(dt.toFixed(3))}s`;
    if (dt >= 1e-3) return `${parseFloat((dt * 1e3).toFixed(3))}ms`;
    if (dt >= 1e-6) return `${parseFloat((dt * 1e6).toFixed(3))}µs`;
    return `${parseFloat((dt * 1e9).toFixed(3))}ns`;
  };

  return (
    <div className="absolute top-6 left-6 pointer-events-none">
      <div className="bg-surface-dim/85 backdrop-blur-md border border-border-hairline p-3 rounded-none text-[10px] font-mono flex flex-col gap-2 min-w-[145px]">
        <div className="flex justify-between border-b border-border-hairline pb-1">
          <span className="text-text-muted">ENGINE_STATUS</span>
          <span className="text-instrument-current font-bold">{simRunning ? 'RUNNING' : 'PAUSED'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">TIME_STEP</span>
          <span className="text-text-secondary">{formatTimeStep(circuit.maxTimeStep)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">SOLVER_METH</span>
          <span className="text-text-secondary">{circuit.isBackwardEuler ? 'BACKWARD_EULER' : 'TRAPEZOIDAL'}</span>
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
