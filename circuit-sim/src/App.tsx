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
  const tool = useUIStore((s) => s.tool);
  const camera = useCircuitStore((s) => s.camera);
  const plotterRef = useCircuitStore((s) => s.plotterRef);

  // Mobile Store values
  const mobileDockHeight = useUIStore((s) => s.mobileDockHeight);
  const activeMobileTab = useUIStore((s) => s.activeMobileTab);

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
    if (!isDesktop && isLandscape) {
      useUIStore.getState().setMobileDockHeight('collapsed');
    }
  }, [isDesktop, isLandscape]);

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