import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import MatrixInspector from './MatrixInspector';
import ConvergenceSparkline from './ConvergenceSparkline';

export interface ProbedItem {
  id: string;
  elmId: string;
  prop: 'V1' | 'V2' | 'I' | 'Vdiff';
  color: string;
}

interface PlotterProps {
  items: ProbedItem[];
  matrixG?: number[][];
  vectorV?: number[];
  vectorI?: number[];
  nrErrors?: number[];
  simRunning?: boolean;
}

export interface PlotterHandle {
  pushData: (t: number, values: number[]) => void;
  clear: () => void;
}

interface ChannelState {
  scale: number;   // units per division (40px)
  offset: number;  // vertical offset in pixels from center
}

const MAX_POINTS = 500;

export const Plotter = forwardRef<PlotterHandle, PlotterProps>(({
  items,
  matrixG = [[0]],
  vectorV = [],
  vectorI = [],
  nrErrors = [],
  simRunning = false
}, ref) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'plotter' | 'diagnostics'>('plotter');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Buffers
  const timesRef = useRef<number[]>([]);
  const valuesRef = useRef<number[][]>([]); // Array of lines, each is an array of points

  // Channel custom scales & offsets (State managed locally)
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelState>>({});

  // Synchronize items and initialize channel configurations
  useEffect(() => {
    setChannelConfigs(prev => {
      const next = { ...prev };
      let changed = false;
      items.forEach(item => {
        if (!next[item.id]) {
          // Default scale: 5V/div or 2mA/div
          const defaultScale = item.prop === 'I' ? 0.002 : 5.0;
          next[item.id] = {
            scale: defaultScale,
            offset: 0
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  useImperativeHandle(ref, () => ({
    pushData: (t: number, values: number[]) => {
      // Initialize value buffers if channel count changes to prevent time desync
      if (valuesRef.current.length !== values.length) {
        valuesRef.current = values.map(() => []);
        timesRef.current = [];
      }

      timesRef.current.push(t);
      if (timesRef.current.length > MAX_POINTS) {
        timesRef.current.shift();
      }

      for (let i = 0; i < values.length; i++) {
        const newVal = values[i];
        valuesRef.current[i].push(newVal);

        if (valuesRef.current[i].length > MAX_POINTS) {
          valuesRef.current[i].shift();
        }
      }

      draw();
    },
    clear: () => {
      timesRef.current = [];
      valuesRef.current = [];
      draw();
    }
  }));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * window.devicePixelRatio) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const pixelsPerDiv = 40;

    // 1. Draw background grid
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    // Vertical grid divisions
    for (let x = 0; x < width; x += pixelsPerDiv) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Horizontal grid divisions
    for (let y = 0; y < height; y += pixelsPerDiv) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center Reference Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    if (timesRef.current.length < 2 || items.length === 0) return;

    const tStart = timesRef.current[0];
    const tEnd = timesRef.current[timesRef.current.length - 1];
    const tSpan = Math.max(1e-6, tEnd - tStart);

    // 2. Draw Channel curves using manual scale and offset configs
    items.forEach((item, i) => {
      if (!valuesRef.current[i]) return;
      
      const config = channelConfigs[item.id] || { scale: item.prop === 'I' ? 0.002 : 5.0, offset: 0 };
      
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const vals = valuesRef.current[i];
      for (let j = 0; j < vals.length; j++) {
        const t = timesRef.current[j];
        const val = vals[j];
        
        const x = ((t - tStart) / tSpan) * width;
        // Y = Center - (Value / ScalePerDiv * PixelsPerDiv) - Offset
        const y = centerY - (val / config.scale * pixelsPerDiv) - config.offset;
        
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [items, channelConfigs]);

  useEffect(() => {
    draw();
  }, [items, draw, channelConfigs, isMinimized, activeTab]);

  const updateChannelConfig = (id: string, updates: Partial<ChannelState>) => {
    setChannelConfigs(prev => {
      const config = prev[id] || { scale: 5.0, offset: 0 };
      return {
        ...prev,
        [id]: { ...config, ...updates }
      };
    });
  };

  const getScaleLabel = (item: ProbedItem, scale: number) => {
    if (item.prop === 'I') {
      const mA = scale * 1000;
      return `${mA.toFixed(1)} mA/div`;
    }
    return `${scale.toFixed(1)} V/div`;
  };

  return (
    <div className={`flex flex-col bg-surface-dim overflow-hidden select-none border-t border-border-hairline z-40 relative flex-shrink-0 transition-all ${isMinimized ? 'h-[40px]' : 'h-[240px]'}`}>
      {/* Header & Tab controls */}
      <div 
        className="h-[40px] border-b border-border-hairline flex items-center justify-between px-4 bg-surface/85 backdrop-blur-md cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-1" onClick={(e) => e.stopPropagation()}>
          {/* Segmented Tab Selector */}
          <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5">
            <button
              onClick={() => {
                setActiveTab('plotter');
                setIsMinimized(false);
              }}
              className={`px-3 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                activeTab === 'plotter' && !isMinimized
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-text-secondary hover:bg-surface-bright/50'
              }`}
            >
              Oscilloscope
            </button>
            <button
              onClick={() => {
                setActiveTab('diagnostics');
                setIsMinimized(false);
              }}
              className={`px-3 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                activeTab === 'diagnostics' && !isMinimized
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-text-secondary hover:bg-surface-bright/50'
              }`}
            >
              Solver Telemetry
            </button>
          </div>

          {/* Tab Specific Options / Legends */}
          {activeTab === 'plotter' && !isMinimized && (
            <div className="flex gap-4">
              {items.map((item, idx) => {
                const config = channelConfigs[item.id] || { scale: item.prop === 'I' ? 0.002 : 5.0, offset: 0 };
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-surface-bright/25 border border-border-hairline px-2 py-0.5 group">
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      <div className="w-2 h-2" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[9px] font-mono font-bold text-text-secondary whitespace-nowrap">
                        CH{idx + 1}: {item.elmId}.{item.prop}
                      </span>
                    </div>
                    
                    {/* Scale & Position Controls */}
                    <div className="flex items-center gap-2 border-l border-border-hairline pl-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[6px] text-text-muted font-bold tracking-tighter uppercase leading-none mb-0.5">Scale</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateChannelConfig(item.id, { scale: config.scale * 2 })}
                            className="text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                            title="Scale Up (Compress Vertically)"
                          >
                            <i className="material-icons text-[10px]">expand_less</i>
                          </button>
                          <span className="text-[8px] font-mono text-text-primary min-w-[32px] text-center">
                            {getScaleLabel(item, config.scale)}
                          </span>
                          <button 
                            onClick={() => updateChannelConfig(item.id, { scale: Math.max(1e-5, config.scale / 2) })}
                            className="text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                            title="Scale Down (Stretch Vertically)"
                          >
                            <i className="material-icons text-[10px]">expand_more</i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center border-l border-border-hairline/50 pl-2">
                        <span className="text-[6px] text-text-muted font-bold tracking-tighter uppercase leading-none mb-0.5">Pos</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateChannelConfig(item.id, { offset: config.offset + 10 })}
                            className="text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                            title="Shift Up"
                          >
                            <i className="material-icons text-[10px]">keyboard_arrow_up</i>
                          </button>
                          <button 
                            onClick={() => updateChannelConfig(item.id, { offset: config.offset - 10 })}
                            className="text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                            title="Shift Down"
                          >
                            <i className="material-icons text-[10px]">keyboard_arrow_down</i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'diagnostics' && !isMinimized && (
            <div className="flex items-center gap-2 text-[9px] text-text-muted font-mono uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-instrument-current animate-pulse' : 'bg-text-muted'}`}></span>
              <span>Live MNA equations & Newton-Raphson error logs</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'plotter' && !isMinimized && (
            <div className="flex items-center gap-3 px-3 py-1 border-x border-border-hairline h-full text-[8px] font-mono text-text-muted uppercase">
              <span>Timebase</span>
              <span className="text-primary font-bold">20ms/div</span>
            </div>
          )}
          <button 
            className="p-1 hover:bg-surface-bright text-text-muted hover:text-text-primary transition-colors focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Main Drawer Content */}
      {!isMinimized && (
        <div className="flex-1 relative overflow-hidden bg-[#07070a] h-[200px]">
          {activeTab === 'plotter' ? (
            <div className="w-full h-full relative cursor-crosshair overflow-hidden plotter-grid">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full block"
              />
              <div className="absolute right-4 bottom-2 pointer-events-none flex items-center gap-4">
                <div className="text-[8px] font-mono text-text-muted bg-surface-dim px-2 py-0.5 border border-border-hairline">
                  BUFFER: ACTIVE
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-x-auto overflow-y-hidden px-6 py-4 flex items-center justify-between gap-8">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-shrink-0">
                  <MatrixInspector data={matrixG} label="Conductance [G]" precision={2} />
                </div>
                <div className="text-sm font-light text-text-muted mx-1 flex-shrink-0">×</div>
                <div className="flex-shrink-0">
                  <MatrixInspector data={vectorV} label="Voltages [v]" precision={2} />
                </div>
                <div className="text-sm font-light text-text-muted mx-1 flex-shrink-0">=</div>
                <div className="flex-shrink-0">
                  <MatrixInspector data={vectorI} label="Sources [i]" precision={2} />
                </div>
              </div>
              
              <div className="flex-shrink-0 pr-4">
                <ConvergenceSparkline errors={nrErrors} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Plotter.displayName = 'Plotter';
