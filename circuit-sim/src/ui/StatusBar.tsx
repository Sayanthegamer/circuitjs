interface StatusBarProps {
  simRunning: boolean;
  stopMessage: string | null;
  simTime: number;
  stepsPerFrame: number;
}

export function StatusBar({ simRunning, stopMessage, simTime, stepsPerFrame }: StatusBarProps) {
  const formatTime = (t: number) => {
    if (t < 1e-9) return `${(t * 1e12).toFixed(2)}ps`;
    if (t < 1e-6) return `${(t * 1e9).toFixed(2)}ns`;
    if (t < 1e-3) return `${(t * 1e6).toFixed(2)}µs`;
    if (t < 1) return `${(t * 1000).toFixed(2)}ms`;
    return `${t.toFixed(4)}s`;
  };

  return (
    <div className="status-bar">
      <div className={`sim-indicator ${simRunning && !stopMessage ? 'active' : ''}`} />
      <span className="time-display">t = {formatTime(simTime)}</span>
      <span className="sep">|</span>
      <span>{stepsPerFrame} steps/frame</span>
      
      {stopMessage && (
        <>
          <span className="sep">|</span>
          <span className="error-msg">⚠ {stopMessage}</span>
        </>
      )}
    </div>
  );
}
