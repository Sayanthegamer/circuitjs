import { useRef, useEffect, useCallback } from 'react';
import {
  VoltageSourceElement,
  ResistorElement,
  DiodeElement,
  WireElement,
  GroundElement,
} from './engine';
import { Toolbar } from './ui/Toolbar';
import { MobileToolbar } from './ui/MobileToolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { Plotter } from './ui/Plotter';
import { ComponentPalette } from './ui/ComponentPalette';
import { SideNavBar } from './ui/SideNavBar';
import NodeHUD from './ui/NodeHUD';
import { WhitepaperContent } from './ui/WhitepaperContent';
import { PWAInstallPrompt } from './ui/PWAInstallPrompt';
import { useSimulationLoop } from './hooks/useSimulationLoop';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCircuitStore } from './stores/circuitStore';
import { useUIStore } from './stores/uiStore';
import { useBreakpoint } from './hooks/useBreakpoint';
import './ui.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Breakpoint detection
  const { isDesktop, isLandscape } = useBreakpoint();

  // Zustand Store values
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const tool = useUIStore((s) => s.tool);
  const camera = useCircuitStore((s) => s.camera);
  const plotterRef = useCircuitStore((s) => s.plotterRef);
  const stopMessage = useCircuitStore((s) => s.stopMessage);

  // Mobile Store values
  const mobileDockHeight = useUIStore((s) => s.mobileDockHeight);
  const activeMobileTab = useUIStore((s) => s.activeMobileTab);

  // Synchronize viewMode with URL search parameters for SEO crawler support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    
    if (urlView === 'whitepaper' || urlView === 'workspace') {
      if (urlView !== viewMode) {
        setViewMode(urlView);
      }
    } else {
      // Initialize query parameter if not present
      params.set('view', viewMode);
      window.history.replaceState(null, '', `?${params.toString()}${window.location.hash}`);
    }

    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const currentUrlView = currentParams.get('view');
      if (currentUrlView === 'whitepaper' || currentUrlView === 'workspace') {
        if (currentUrlView !== useUIStore.getState().viewMode) {
          useUIStore.getState().setViewMode(currentUrlView);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    if (urlView !== viewMode) {
      params.set('view', viewMode);
      window.history.pushState(null, '', `?${params.toString()}${window.location.hash}`);
    }

    // Dynamically update the canonical link to match the active view parameter
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = `https://circuitjs.vercel.app/?view=${viewMode}`;
  }, [viewMode]);

  // Handle hash scrolling on page load/view switch for the whitepaper documentation
  useEffect(() => {
    if (viewMode === 'whitepaper' && window.location.hash) {
      const hashId = window.location.hash.substring(1);
      const timer = setTimeout(() => {
        const element = document.getElementById(hashId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Canvas Sizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  // Recalculate size when viewMode, mobile height, or active tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      resizeCanvas();
    }, 150); // Slightly longer delay to allow CSS transitions to complete
    return () => clearTimeout(timer);
  }, [viewMode, mobileDockHeight, activeMobileTab, resizeCanvas]);

  // Resize listener
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Init circuit and camera on mount
  useEffect(() => {
    const { circuit, camera: cam, setProbedItems, loadFromLocalStorage } = useCircuitStore.getState();
    circuit.clearElements();
    circuit.stopMessage = null;

    const loaded = loadFromLocalStorage();
    if (!loaded) {
      const vs    = new VoltageSourceElement(0, 160, 0, 0, 5);
      const r1    = new ResistorElement(0, 0, 160, 0, 1000);
      const diode = new DiodeElement(160, 0, 160, 160);
      const w1    = new WireElement(160, 160, 0, 160);
      const gnd   = new GroundElement(0, 160);

      circuit.addElement(vs);
      circuit.addElement(r1);
      circuit.addElement(diode);
      circuit.addElement(w1);
      circuit.addElement(gnd);

      circuit.analyzeCircuit();

      // Auto-probe the diode voltage and current to boot-start the Plotter beautifully
      setProbedItems([
        { id: `${diode.id}_Vdiff`, elmId: diode.id, prop: 'Vdiff', color: '#6366f1' },
        { id: `${diode.id}_I`, elmId: diode.id, prop: 'I', color: '#ffee64' }
      ]);
    } else {
      // Validate probed items for loaded circuit
      const currentProbed = useCircuitStore.getState().probedItems;
      const validProbed = currentProbed.filter(item => circuit.getElement(item.elmId) !== null);
      setProbedItems(validProbed);
    }

    // Center camera on the circuit
    const dpr = window.devicePixelRatio || 1;
    if (canvasRef.current) {
      cam.centerOn(-40, -40, 240, 240, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
    }
  }, []);

  // Core Loops & Interactions
  useSimulationLoop(canvasRef);
  const handlers = useCanvasInteraction(canvasRef);
  useKeyboardShortcuts();

  // Collapse mobile dock when rotating sideways to landscape
  useEffect(() => {
    if (!isDesktop && isLandscape && mobileDockHeight !== 'collapsed') {
      useUIStore.getState().setMobileDockHeight('collapsed');
    }
  }, [isDesktop, isLandscape, mobileDockHeight]);

  // Close mobile menu when switching to desktop viewport
  useEffect(() => {
    if (isDesktop) {
      useUIStore.getState().setMobileMenuOpen(false);
    }
  }, [isDesktop]);

  const canvasContainer = (
    <div
      className={
        viewMode === 'workspace'
          ? "canvas-container w-full h-full relative group border-none"
          : "canvas-container aspect-video w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] relative group"
      }
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        className="circuit-canvas"
        onPointerDown={handlers.handlePointerDown}
        onPointerMove={handlers.handlePointerMove}
        onPointerUp={handlers.handlePointerUp}
        onPointerCancel={handlers.handlePointerUp}
        onPointerOut={handlers.handlePointerUp}
        onPointerLeave={() => useUIStore.getState().setHoveredElm(null)}
        onWheel={handlers.handleWheel}
        onContextMenu={handlers.handleContextMenu}
        style={{
          cursor: tool === 'select' ? (camera.panning ? 'grabbing' : 'default') : 'crosshair'
        }}
      />

      {/* Float HUD card on hovered element */}
      <NodeHUD />
      {/* Overload Warning Banner Overlay */}
      {stopMessage && (
        <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-xs flex items-center justify-center p-6 z-40 transition-all duration-300">
          <div className="max-w-md w-full bg-surface border border-voltage-neg/30 p-6 shadow-2xl relative overflow-hidden">
            {/* Corner styling for high-tech look */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-voltage-neg"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-voltage-neg"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-voltage-neg"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-voltage-neg"></div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 bg-voltage-neg/10 text-voltage-neg rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-bold font-mono tracking-wider text-voltage-neg uppercase">
                  {stopMessage.includes("Overload") ? "Simulation Overload Warning" : "Simulation Halted"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {stopMessage}
                </p>
                {stopMessage.includes("Overload") && (
                  <p className="text-[10px] text-accent/80 leading-relaxed font-mono">
                    Warning: Winding currents/voltages have exceeded safe classroom bounds. To prevent system lock-ups and protect computer resources, the safety interrupter has automatically halted computation.
                  </p>
                )}
                <div className="pt-2 flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const { circuit } = useCircuitStore.getState();
                      circuit.stopMessage = null;
                      useCircuitStore.getState().updateTelemetry({
                        matrixG: circuit.lastG && circuit.lastG.length > 0 ? circuit.lastG.map(row => [...row]) : [[0]],
                        vectorV: circuit.lastV && circuit.lastV.length > 0 ? [...circuit.lastV] : [],
                        vectorI: circuit.lastI && circuit.lastI.length > 0 ? [...circuit.lastI] : [],
                        nrErrors: circuit.lastErrors && circuit.lastErrors.length > 0 ? [...circuit.lastErrors] : [],
                        simTime: circuit.t,
                        stepsPerFrame: 0,
                        stopMessage: null,
                      });
                    }}
                    className="px-3 py-1.5 bg-surface-bright border border-border-hairline text-[10px] uppercase font-bold tracking-wider hover:bg-surface-bright/80 cursor-pointer transition-colors"
                  >
                    Dismiss Warning
                  </button>
                  <button
                    onClick={() => {
                      useCircuitStore.getState().restoreLastStableConfig();
                    }}
                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-[10px] uppercase font-bold tracking-wider text-accent cursor-pointer transition-colors"
                  >
                    Restore Last Stable
                  </button>
                  <button
                    onClick={() => {
                      useCircuitStore.getState().resetSim();
                    }}
                    className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-[10px] uppercase font-bold tracking-wider text-primary cursor-pointer transition-colors"
                  >
                    Reset Simulation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Dynamic bottom padding to make sure the canvas does not get cut off by bottom dock
  const paddingBottomClass = isDesktop
    ? 'pb-[40px]' // Desktop plotter min height
    : (isLandscape
        ? 'pb-[42px]' // Landscape collapsed plotter
        : (mobileDockHeight === 'collapsed'
            ? 'pb-[42px]'
            : mobileDockHeight === 'medium'
              ? 'pb-[250px]'
              : 'pb-[400px]'));

  return (
    <div className="flex flex-col h-screen bg-surface-dim text-text-primary overflow-hidden font-sans">
      {/* Top Toolbar - Desktop vs Mobile */}
      {isDesktop ? <Toolbar /> : <MobileToolbar />}

      {/* Main layout container with dynamic padding for bottom control dock */}
      <div className={`flex flex-1 overflow-hidden pt-12 lg:pt-[46px] transition-all duration-300 ${paddingBottomClass}`}>
        
        {/* Left Sidebar (Documentation Navigation & Component Palette) */}
        {/* Desktop OR landscape mobile/tablet can show side panel */}
        <aside className={`hidden lg:flex w-[280px] flex-shrink-0 border-r border-border-hairline bg-surface flex-col h-full overflow-hidden ${!isDesktop && isLandscape ? '!flex w-[200px]' : ''}`}>
          {viewMode === 'whitepaper' && <SideNavBar />}
          <div className={`flex-1 overflow-y-auto ${viewMode === 'whitepaper' ? 'border-t border-border-hairline' : ''}`}>
            <div className="px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] text-text-muted font-bold font-mono">
              Component Palette
            </div>
            <ComponentPalette />
          </div>
        </aside>

        {/* Main Workspace / Whitepaper Area */}
        {viewMode === 'workspace' ? (
          <main className="flex-1 h-full relative overflow-hidden bg-surface-dim">
            {canvasContainer}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-surface-dim relative scroll-smooth no-scrollbar">
            {/* Mobile whitepaper table of contents */}
            {!isDesktop && <SideNavBar />}
            {/* Whitepaper content with canvas embedding */}
            <WhitepaperContent canvasContainer={canvasContainer} />
          </main>
        )}

        {/* Right Sidebar (Properties Panel) */}
        {/* Desktop OR landscape mobile/tablet can show side panel */}
        <aside className={`hidden lg:flex w-[320px] flex-shrink-0 border-l border-border-hairline bg-surface flex-col h-full overflow-y-auto no-scrollbar ${!isDesktop && isLandscape ? '!flex w-[240px]' : ''}`}>
          <PropertiesPanel />
        </aside>
      </div>

      {/* Floating PWA Install Prompt Banner */}
      {!isDesktop && <PWAInstallPrompt />}

      {/* Quick hint instructions for placing/deleting (rendered globally above plotter) */}
      {tool !== 'select' && (
        <div className={`fixed ${isDesktop ? 'bottom-[60px]' : (mobileDockHeight === 'collapsed' ? 'bottom-[60px]' : (mobileDockHeight === 'medium' ? 'bottom-[270px]' : 'bottom-[420px]'))} left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface border border-border-hairline text-xs font-mono text-text-primary shadow-xl transition-all duration-300`}>
          {tool === 'ground'
            ? 'Click canvas to place ground reference node'
            : `Click and drag on canvas to place ${tool}`
          } · Press <kbd className="bg-surface-bright px-1 py-0.5 text-[10px] border border-border-hairline">Esc</kbd> to cancel
        </div>
      )}

      {/* Bottom Panel: Unified Mobile Control Dock (Portrait) or Collapsed Oscilloscope View (Landscape/Desktop) */}
      <Plotter ref={plotterRef} />
    </div>
  );
}

export default App;