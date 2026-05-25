import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Sliders, 
  Activity, 
  Cpu, 
  Play, 
  Pause, 
  AlertTriangle 
} from 'lucide-react';
import MatrixInspector from './MatrixInspector';
import ConvergenceSparkline from './ConvergenceSparkline';
import { MobileComponentPalette } from './MobileComponentPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface ProbedItem {
  id: string;
  elmId: string;
  prop: 'V1' | 'V2' | 'I' | 'Vdiff';
  color: string;
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

export const Plotter = forwardRef<PlotterHandle>((_, ref) => {
  const items = useCircuitStore((s) => s.probedItems);
  const matrixG = useCircuitStore((s) => s.matrixG);
  const vectorV = useCircuitStore((s) => s.vectorV);
  const vectorI = useCircuitStore((s) => s.vectorI);
  const nrErrors = useCircuitStore((s) => s.nrErrors);
  const simRunning = useCircuitStore((s) => s.simRunning);
  const setSimRunning = useCircuitStore((s) => s.setSimRunning);
  const stopMessage = useCircuitStore((s) => s.stopMessage);
  const selectedId = useUIStore((s) => s.selectedId);

  // Breakpoints
  const { isDesktop } = useBreakpoint();

  // Desktop minimize states
  const isMinimized = useUIStore((s) => s.plotterMinimized);
  const setIsMinimized = useUIStore((s) => s.setPlotterMinimized);
  const [activeTab, setActiveTab] = useState<'plotter' | 'diagnostics'>('plotter');

  // Mobile states
  const activeMobileTab = useUIStore((s) => s.activeMobileTab);
  const setActiveMobileTab = useUIStore((s) => s.setActiveMobileTab);
  const mobileDockHeight = useUIStore((s) => s.mobileDockHeight);
  const setMobileDockHeight = useUIStore((s) => s.setMobileDockHeight);

  // Map active tab across desktop/mobile
  const currentTab = isDesktop 
    ? activeTab 
    : (activeMobileTab === 'scope' ? 'plotter' : activeMobileTab === 'solver' ? 'diagnostics' : activeMobileTab);

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
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.scale(dpr, dpr);
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
  }, [items, draw, channelConfigs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [draw, isMinimized, mobileDockHeight, currentTab]);

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
      return `${mA.toFixed(1)} mA`;
    }
    return `${scale.toFixed(1)} V`;
  };

  const handleTabClick = (tab: 'palette' | 'properties' | 'plotter' | 'diagnostics') => {
    if (isDesktop) {
      setActiveTab(tab as 'plotter' | 'diagnostics');
      setIsMinimized(false);
    } else {
      const mapped = tab === 'plotter' ? 'scope' : tab === 'diagnostics' ? 'solver' : tab;
      setActiveMobileTab(mapped as 'palette' | 'properties' | 'scope' | 'solver');
      if (mobileDockHeight === 'collapsed') {
        setMobileDockHeight('medium');
      }
    }
  };

  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDesktop) {
      setIsMinimized(!isMinimized);
    } else {
      setMobileDockHeight(mobileDockHeight === 'collapsed' ? 'medium' : 'collapsed');
    }
  };

  const cycleHeightDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mobileDockHeight === 'expanded') {
      setMobileDockHeight('medium');
    } else {
      setMobileDockHeight('collapsed');
    }
  };

  const cycleHeightUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mobileDockHeight === 'collapsed') {
      setMobileDockHeight('medium');
    } else {
      setMobileDockHeight('expanded');
    }
  };

  // Resolve container styles dynamically
  const containerHeightClass = isDesktop
    ? (isMinimized ? 'h-[40px]' : 'h-[160px] md:h-[240px]')
    : (mobileDockHeight === 'collapsed' ? 'h-[42px]' : mobileDockHeight === 'medium' ? 'h-[250px]' : 'h-[400px]');

  const isCollapsed = isDesktop ? isMinimized : mobileDockHeight === 'collapsed';

  return (
    <div className={`flex flex-col bg-surface/90 backdrop-blur-md overflow-hidden select-none border-t border-border-hairline z-40 absolute bottom-0 left-0 w-full transition-all duration-300 ease-in-out ${containerHeightClass}`}>
      {/* Header & Tab controls */}
      <div
        className="h-[40px] md:h-[42px] border-b border-border-hairline flex items-center justify-between px-3 md:px-4 bg-surface-dim/40 cursor-pointer"
        onClick={handleCollapseToggle}
      >
        <div className="flex items-center gap-2 md:gap-6 overflow-x-auto no-scrollbar py-1" onClick={(e) => e.stopPropagation()}>
          {/* Segmented Tab Selector */}
          <div className="flex items-center gap-0.5 bg-surface-dim border border-border-hairline p-0.5 flex-shrink-0">
            {/* Mobile-only Palette & Properties tabs */}
            {!isDesktop && (
              <>
                <button
                  onClick={() => handleTabClick('palette')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                    currentTab === 'palette' && !isCollapsed
                      ? 'bg-surface-bright text-primary font-bold shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                      : 'text-text-secondary hover:bg-surface-bright/35'
                  }`}
                >
                  <Plus size={10} />
                  Add
                </button>
                <button
                  onClick={() => handleTabClick('properties')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                    currentTab === 'properties' && !isCollapsed
                      ? 'bg-surface-bright text-primary font-bold shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                      : 'text-text-secondary hover:bg-surface-bright/35'
                  }`}
                >
                  <Sliders size={10} />
                  Inspect {selectedId && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                </button>
              </>
            )}

            {/* Standard Scope & Solver tabs */}
            <button
              onClick={() => handleTabClick('plotter')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                currentTab === 'plotter' && !isCollapsed
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-text-secondary hover:bg-surface-bright/35'
              }`}
            >
              <Activity size={10} />
              Scope
            </button>
            <button
              onClick={() => handleTabClick('diagnostics')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all focus:outline-none rounded-none cursor-pointer ${
                currentTab === 'diagnostics' && !isCollapsed
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-text-secondary hover:bg-surface-bright/35'
              }`}
            >
              <Cpu size={10} />
              Solver
            </button>
          </div>

          {/* Tab Specific Options / Legends */}
          {currentTab === 'plotter' && !isCollapsed && (
            <div className="flex gap-2 md:gap-4 overflow-x-auto plotter-channel-legend pb-1 no-scrollbar">
              {items.map((item, idx) => {
                const config = channelConfigs[item.id] || { scale: item.prop === 'I' ? 0.002 : 5.0, offset: 0 };
                return (
                  <div key={item.id} className="flex items-center gap-1.5 bg-surface-bright/25 border border-border-hairline px-2 py-0.5 group flex-shrink-0">
                    <div className="flex items-center gap-1 min-w-[45px] md:min-w-[70px]">
                      <div className="w-1.5 h-1.5" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[7.5px] md:text-[9px] font-mono font-bold text-text-secondary whitespace-nowrap">
                        CH{idx + 1}
                      </span>
                    </div>

                    {/* Scale & Position Controls */}
                    <div className="flex items-center gap-1 border-l border-border-hairline pl-1.5">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateChannelConfig(item.id, { scale: config.scale * 2 })}
                          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer w-4 h-4 flex items-center justify-center"
                          title="Scale Up"
                        >
                          <i className="material-icons text-[10px]">expand_less</i>
                        </button>
                        <span className="text-[7px] md:text-[8px] font-mono text-text-primary min-w-[24px] text-center">
                          {getScaleLabel(item, config.scale)}
                        </span>
                        <button
                          onClick={() => updateChannelConfig(item.id, { scale: Math.max(1e-5, config.scale / 2) })}
                          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer w-4 h-4 flex items-center justify-center"
                          title="Scale Down"
                        >
                          <i className="material-icons text-[10px]">expand_more</i>
                        </button>
                      </div>

                      <div className="hidden md:flex items-center border-l border-border-hairline/50 pl-1">
                        <button
                          onClick={() => updateChannelConfig(item.id, { offset: config.offset + 10 })}
                          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer w-4 h-4 flex items-center justify-center"
                          title="Shift Up"
                        >
                          <i className="material-icons text-[10px]">keyboard_arrow_up</i>
                        </button>
                        <button
                          onClick={() => updateChannelConfig(item.id, { offset: config.offset - 10 })}
                          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer w-4 h-4 flex items-center justify-center"
                          title="Shift Down"
                        >
                          <i className="material-icons text-[10px]">keyboard_arrow_down</i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentTab === 'diagnostics' && !isCollapsed && (
            <div className="flex items-center gap-1.5 text-[8px] text-text-muted font-mono uppercase hidden sm:flex">
              <span className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-instrument-current animate-pulse' : 'bg-text-muted'}`}></span>
              <span>MNA diagnostics</span>
            </div>
          )}
        </div>

        {/* Dynamic Status / Height controls on the right */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {stopMessage && (
            <div className="flex items-center gap-1 text-[8px] text-voltage-neg font-mono uppercase bg-voltage-neg/10 border border-voltage-neg/20 px-1.5 py-0.5">
              <AlertTriangle size={8} className="animate-bounce" />
              <span className="hidden sm:inline">Err</span>
            </div>
          )}

          {isCollapsed && isDesktop && currentTab === 'plotter' && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 border-x border-border-hairline h-full text-[8px] font-mono text-text-muted uppercase">
              <span>Timebase</span>
              <span className="text-primary font-bold">20ms/div</span>
            </div>
          )}

          {/* Collapsed play toggle for mobile */}
          {!isDesktop && isCollapsed && (
            <button 
              onClick={() => setSimRunning(!simRunning)}
              className={`w-6 h-6 border flex items-center justify-center transition-colors cursor-pointer rounded-none ${
                simRunning 
                  ? 'border-instrument-current/40 bg-instrument-current/10 text-instrument-current' 
                  : 'border-border-hairline bg-surface hover:bg-surface-bright'
              }`}
            >
              {simRunning ? <Pause size={10} /> : <Play size={10} />}
            </button>
          )}

          {/* Desktop/Mobile expander toggles */}
          {isDesktop ? (
            <button
              className="p-1 hover:bg-surface-bright text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
            >
              {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <div className="flex items-center gap-0.5 border-l border-border-hairline pl-1.5">
              {!isCollapsed && (
                <button
                  className="p-0.5 hover:bg-surface-bright text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                  onClick={cycleHeightDown}
                >
                  <ChevronDown size={14} />
                </button>
              )}
              {mobileDockHeight !== 'expanded' && (
                <button
                  className="p-0.5 hover:bg-surface-bright text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                  onClick={cycleHeightUp}
                >
                  <ChevronUp size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Drawer Content */}
      <div className={`flex-1 relative overflow-hidden bg-[#07070a] ${isCollapsed ? 'hidden' : 'block'}`}>
        
        {/* Mobile Palette View */}
        {!isDesktop && currentTab === 'palette' && (
          <div className="w-full h-full flex flex-col p-3 overflow-hidden">
            <MobileComponentPalette isInline={true} />
          </div>
        )}

        {/* Mobile Properties Inspector */}
        {!isDesktop && currentTab === 'properties' && (
          <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar">
            <PropertiesPanel showHeader={false} />
          </div>
        )}

        {/* Oscilloscope Container */}
        <div className={`w-full h-full relative cursor-crosshair overflow-hidden plotter-grid ${currentTab === 'plotter' ? 'block' : 'hidden'}`}>
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
          <div className="absolute right-2 md:right-4 bottom-1 md:bottom-2 pointer-events-none flex items-center gap-2 md:gap-4">
            <div className="hidden sm:block text-[7px] md:text-[8px] font-mono text-text-muted bg-surface-dim px-1.5 md:px-2 py-0.5 border border-border-hairline">
              BUFFER: ACTIVE
            </div>
          </div>
        </div>

        {/* Solver Telemetry Container */}
        <div className={`w-full h-full overflow-x-auto overflow-y-auto px-3 py-3 flex items-center justify-between gap-4 md:gap-8 select-text no-scrollbar ${currentTab === 'diagnostics' ? 'flex' : 'hidden'}`}>
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <div className="flex-shrink-0">
              <MatrixInspector data={matrixG} label="Conductance [G]" precision={2} />
            </div>
            <div className="text-xs md:text-sm font-light text-text-muted mx-0.5 md:mx-1 flex-shrink-0">×</div>
            <div className="flex-shrink-0">
              <MatrixInspector data={vectorV} label="Voltages [v]" precision={2} />
            </div>
            <div className="text-xs md:text-sm font-light text-text-muted mx-0.5 md:mx-1 flex-shrink-0">=</div>
            <div className="flex-shrink-0">
              <MatrixInspector data={vectorI} label="Sources [i]" precision={2} />
            </div>
          </div>

          <div className="flex-shrink-0 pr-2">
            <ConvergenceSparkline errors={nrErrors} />
          </div>
        </div>
      </div>
    </div>
  );
});

Plotter.displayName = 'Plotter';

export default Plotter;