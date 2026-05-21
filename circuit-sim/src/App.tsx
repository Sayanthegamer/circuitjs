/* eslint-disable react-hooks/refs, react-hooks/immutability */
import { useRef, useEffect, useCallback, useState } from 'react';
import { 
  Circuit, 
  ResistorElement, 
  VoltageSourceElement, 
  WireElement, 
  GroundElement, 
  CapacitorElement, 
  InductorElement, 
  SwitchElement, 
  DiodeElement, 
  LEDElement 
} from './engine';
import type { ICircuitElement } from './engine/types';
import { Camera } from './renderer/camera';
import { drawGrid, GRID_SIZE } from './renderer/grid';
import { drawElement } from './renderer/element-renderers';
import { Toolbar } from './ui/Toolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { Plotter, type ProbedItem, type PlotterHandle } from './ui/Plotter';
import { ComponentPalette } from './ui/ComponentPalette';
import { SolverMatrixSystem } from './ui/MatrixInspector';
import ConvergenceSparkline from './ui/ConvergenceSparkline';
import NodeHUD from './ui/NodeHUD';
import SideNavBar from './ui/SideNavBar';
import './App.css';
import './ui.css';

export type ToolMode = 'select' | 'wire' | 'resistor' | 'voltage' | 'ground' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'led';

interface PlacingState {
  type: ToolMode;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  phase: 'first' | 'second'; // first click or dragging
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circuitRef = useRef(new Circuit());
  const cameraRef = useRef(new Camera());
  const animTimeRef = useRef(0);
  const rafRef = useRef(0);
  const simRunningRef = useRef(true);
  const showValuesRef = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const placingRef = useRef<PlacingState | null>(null);
  const activePointers = useRef(new Map<number, React.PointerEvent>());
  const lastPinchDist = useRef<number | null>(null);
  const uiUpdateCounter = useRef(0);

  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(true);
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [probedItems, setProbedItems] = useState<ProbedItem[]>([]);
  const plotterRef = useRef<PlotterHandle>(null);
  const [simTime, setSimTime] = useState(0);
  const [stopMessage, setStopMessage] = useState<string | null>(null);
  const [stepsPerFrame, setStepsPerFrame] = useState(0);
  const [showValues, setShowValues] = useState(true);

  // Live telemetry state for technical whitepaper elements
  const [matrixG, setMatrixG] = useState<number[][]>([[0]]);
  const [vectorV, setVectorV] = useState<number[]>([]);
  const [vectorI, setVectorI] = useState<number[]>([]);
  const [nrErrors, setNrErrors] = useState<number[]>([]);
  const [hoveredElm, setHoveredElm] = useState<ICircuitElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Keep refs in sync with state
  useEffect(() => { simRunningRef.current = simRunning; }, [simRunning]);
  useEffect(() => { showValuesRef.current = showValues; }, [showValues]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { placingRef.current = placing; }, [placing]);

  // --- Sizing ---
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

  // --- Init ---
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Build a demo non-linear circuit: AC/DC Voltage Source → Resistor → Diode → Ground
    const circuit = circuitRef.current;
    circuit.clearElements();
    circuit.stopMessage = null;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProbedItems([
      { id: `${diode.id}_Vdiff`, elmId: diode.id, prop: 'Vdiff', color: '#6366f1' },
      { id: `${diode.id}_I`, elmId: diode.id, prop: 'I', color: '#ffee64' }
    ]);

    // Center camera on the circuit
    const cam = cameraRef.current;
    cam.centerOn(-40, -40, 240, 240, canvasRef.current!.width / (window.devicePixelRatio || 1), canvasRef.current!.height / (window.devicePixelRatio || 1));

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // --- Render Loop (stable — no React state deps) ---
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const circuit = circuitRef.current;
      const camera = cameraRef.current;

      // Simulate
      let steps = 0;
      if (simRunningRef.current && !circuit.stopMessage) {
        const targetSteps = Math.round(circuit.maxTimeStep > 0 ? (1 / 60) / circuit.maxTimeStep : 100);
        const maxSteps = Math.min(targetSteps, 2000);
        for (let i = 0; i < maxSteps; i++) {
          if (!circuit.runStep()) break;
          steps++;
        }
      }

      // Advance animation time
      animTimeRef.current += 1 / 60;

      // Update camera interpolation
      camera.update();

      // Clear
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);

      // Apply camera
      camera.apply(ctx);

      // View bounds in world space
      const topLeft = camera.screenToWorld(0, 0);
      const bottomRight = camera.screenToWorld(w, h);

      // Draw grid
      drawGrid(ctx, topLeft.x, topLeft.y, bottomRight.x, bottomRight.y, camera.zoom);

      // Draw elements
      const curSelectedId = selectedIdRef.current;
      for (const elm of circuit.elements) {
        const isSelected = elm.id === curSelectedId;
        drawElement(ctx, elm, isSelected, animTimeRef.current, camera.zoom);
      }

      // Draw value labels
      if (showValuesRef.current && camera.zoom > 0.4) {
        ctx.font = `${Math.max(9, 11 / Math.max(camera.zoom, 0.5))}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        for (const elm of circuit.elements) {
          if (elm.type === 'wire' || elm.type === 'ground') continue;
          const cx = (elm.x + elm.x2) / 2;
          const cy = (elm.y + elm.y2) / 2;
          const dx = elm.x2 - elm.x;
          const dy = elm.y2 - elm.y;
          const perpX = -dy;
          const perpY = dx;
          const pLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const offset = 14;
          const lx = cx + (perpX / pLen) * offset;
          const ly = cy + (perpY / pLen) * offset;

          let label = '';
          if (elm.type === 'resistor') {
            const r = (elm as ResistorElement).resistance;
            label = r >= 1e6 ? `${(r / 1e6).toFixed(1)}MΩ` : r >= 1000 ? `${(r / 1000).toFixed(1)}kΩ` : `${r}Ω`;
          } else if (elm.type === 'voltage') {
            label = `${(elm as VoltageSourceElement).maxVoltage}V`;
          }

          if (label) {
            ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
            ctx.fillText(label, lx, ly);
          }

          // Current label
          const cur = elm.getCurrent();
          if (Math.abs(cur) > 1e-12) {
            const curLabel = Math.abs(cur) >= 1
              ? `${cur.toFixed(2)}A`
              : Math.abs(cur) >= 1e-3
                ? `${(cur * 1000).toFixed(2)}mA`
                : `${(cur * 1e6).toFixed(1)}µA`;
            ctx.fillStyle = 'rgba(255, 238, 100, 0.5)';
            ctx.fillText(curLabel, lx, ly + 13);
          }
        }
      }

      // Draw ghost element being placed
      const curPlacing = placingRef.current;
      if (curPlacing && curPlacing.phase === 'second') {
        ctx.globalAlpha = 0.4;
        const mockElm = {
          type: curPlacing.type, x: curPlacing.x1, y: curPlacing.y1, x2: curPlacing.x2, y2: curPlacing.y2,
          volts: [0, 0], nodes: [0, 0],
          getCurrent: () => 0,
        } as unknown as ICircuitElement;
        drawElement(ctx, mockElm, false, 0, 1);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Update Plotter
      if (plotterRef.current && probedItems.length > 0) {
        const values = probedItems.map(item => {
          const e = circuit.getElement(item.elmId);
          if (!e) return 0;
          switch (item.prop) {
            case 'V1': return e.volts[0];
            case 'V2': return e.volts[1];
            case 'Vdiff': return e.volts[0] - e.volts[1];
            case 'I': return e.getCurrent();
            default: return 0;
          }
        });
        plotterRef.current.pushData(circuit.t, values);
      }

      // Update UI telemetry at ~4Hz to avoid excessive re-renders
      uiUpdateCounter.current++;
      if (uiUpdateCounter.current % 15 === 0) {
        setSimTime(circuit.t);
        setStepsPerFrame(steps);
        setStopMessage(circuit.stopMessage);

        // Feed matrix telemetry safely
        if (circuit.lastG && circuit.lastG.length > 0) {
          setMatrixG(circuit.lastG.map(row => [...row]));
        } else {
          setMatrixG([[0]]);
        }
        if (circuit.lastV && circuit.lastV.length > 0) {
          setVectorV([...circuit.lastV]);
        } else {
          setVectorV([]);
        }
        if (circuit.lastI && circuit.lastI.length > 0) {
          setVectorI([...circuit.lastI]);
        } else {
          setVectorI([]);
        }
        if (circuit.lastErrors && circuit.lastErrors.length > 0) {
          setNrErrors([...circuit.lastErrors]);
        } else {
          setNrErrors([]);
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [probedItems]);

  // --- Mouse Handlers ---
  const getWorldPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return cameraRef.current.screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to canvas
    canvas.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, e);

    const rect = canvas.getBoundingClientRect();

    if (activePointers.current.size === 2) {
      // Start two-finger gesture
      const pointers = Array.from(activePointers.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const midX = (p1.clientX + p2.clientX) / 2 - rect.left;
      const midY = (p1.clientY + p2.clientY) / 2 - rect.top;

      cameraRef.current.startPan(midX, midY);

      // Initialize pinch distance
      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      lastPinchDist.current = Math.hypot(dx, dy);

      // Cancel any placement
      setPlacing(null);
      return;
    } else if (activePointers.current.size > 2) {
       return; // Ignore more than 2 fingers
    }

    // Single pointer down (mouse or 1 finger)
    // Middle-click or right-click: start panning
    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2)) {
      e.preventDefault();
      cameraRef.current.startPan(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Force clear panning if it somehow got stuck before resetting it on this pointer down
    if (cameraRef.current.panning) {
      cameraRef.current.endPan();
    }

    // Left-click or single touch
    if (e.pointerType === 'mouse' ? e.button === 0 : e.isPrimary) {
      const world = getWorldPos(e);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };

      if (tool === 'select') {
        // Try to find an element near click
        const circuit = circuitRef.current;
        let found: ICircuitElement | null = null;
        let bestDist = 20;

        for (const elm of circuit.elements) {
          const d = distToElement(world.x, world.y, elm);
          if (d < bestDist) {
            bestDist = d;
            found = elm;
          }
        }

        if (found) {
          setSelectedId(found.id);
        } else {
          setSelectedId(null);
          // Start panning on empty space with select tool
          cameraRef.current.startPan(e.clientX - rect.left, e.clientY - rect.top);
        }
      } else if (tool === 'ground') {
        // Ground is single-click placement
        const circuit = circuitRef.current;
        const gnd = new GroundElement(snapped.x, snapped.y);
        circuit.addElement(gnd);
        circuit.analyzeCircuit();
        setSelectedId(gnd.id);
        setTool('select');
      } else {
        // Start placing a 2-post element
        setPlacing({
          type: tool,
          x1: snapped.x, y1: snapped.y,
          x2: snapped.x, y2: snapped.y,
          phase: 'second',
        });
      }
    }
  }, [tool, getWorldPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, e);
    }

    // Track mouse coordinates for NodeHUD
    setMousePos({ x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      // Two-finger Pan & Zoom
      const pointers = Array.from(activePointers.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];

      const midX = (p1.clientX + p2.clientX) / 2 - rect.left;
      const midY = (p1.clientY + p2.clientY) / 2 - rect.top;

      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      const dist = Math.hypot(dx, dy);

      if (lastPinchDist.current !== null) {
         const delta = dist - lastPinchDist.current;
         if (Math.abs(delta) > 0.5) { // small threshold
             cameraRef.current.handleTouchZoom(delta, midX, midY);
         }
      }

      lastPinchDist.current = dist;

      if (cameraRef.current.panning) {
          cameraRef.current.updatePan(midX, midY);
      }

      return;
    }

    // Single pointer move
    // Panning
    if (cameraRef.current.panning) {
      if (activePointers.current.size === 1 || e.pointerType === 'mouse') {
        cameraRef.current.updatePan(e.clientX - rect.left, e.clientY - rect.top);
      }
      return;
    }

    // Placing element
    if (placing && placing.phase === 'second') {
      const world = getWorldPos(e);
      let yOffset = 0;
      if (window.matchMedia('(pointer: coarse)').matches) {
          yOffset = -40; // coarse pointer fat-finger offset
      }
      let finalWorld = world;
      if (yOffset !== 0) {
          finalWorld = cameraRef.current.screenToWorld(
              e.clientX - rect.left,
              e.clientY - rect.top + yOffset
          );
      }

      const snapped = { x: snapToGrid(finalWorld.x), y: snapToGrid(finalWorld.y) };
      setPlacing(prev => prev ? { ...prev, x2: snapped.x, y2: snapped.y } : null);
      return;
    }

    // Hover info & element tracking for NodeHUD
    if (tool === 'select') {
      const world = getWorldPos(e);
      const circuit = circuitRef.current;
      let found: ICircuitElement | null = null;
      let bestDist = 15;
      for (const elm of circuit.elements) {
        const d = distToElement(world.x, world.y, elm);
        if (d < bestDist) { bestDist = d; found = elm; }
      }
      if (found) {
        setHoveredElm(found);
      } else {
        setHoveredElm(null);
      }
    } else {
      setHoveredElm(null);
    }
  }, [placing, getWorldPos, tool]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }

    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2)) {
      cameraRef.current.endPan();
      return;
    } else if (activePointers.current.size === 0 && cameraRef.current.panning) {
      cameraRef.current.endPan();
    } else if (activePointers.current.size === 1 && cameraRef.current.panning) {
      cameraRef.current.endPan();
    }

    // Finish placing element
    if (placing && placing.phase === 'second') {
      const world = getWorldPos(e);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };
      const x2 = snapped.x;
      const y2 = snapped.y;

      if (x2 === placing.x1 && y2 === placing.y1) {
        setPlacing(null);
        return;
      }

      const circuit = circuitRef.current;
      let newElm: ICircuitElement | null = null;

      switch (placing.type) {
        case 'wire':
          newElm = new WireElement(placing.x1, placing.y1, x2, y2);
          break;
        case 'resistor':
          newElm = new ResistorElement(placing.x1, placing.y1, x2, y2, 1000);
          break;
        case 'capacitor':
          newElm = new CapacitorElement(placing.x1, placing.y1, x2, y2);
          (newElm as CapacitorElement).capacitance = 1e-3;
          break;
        case 'inductor':
          newElm = new InductorElement(placing.x1, placing.y1, x2, y2);
          (newElm as InductorElement).inductance = 1;
          break;
        case 'switch':
          newElm = new SwitchElement(placing.x1, placing.y1, x2, y2);
          break;
        case 'diode':
          newElm = new DiodeElement(placing.x1, placing.y1, x2, y2);
          break;
        case 'led':
          newElm = new LEDElement(placing.x1, placing.y1, x2, y2);
          break;
        case 'voltage':
          newElm = new VoltageSourceElement(placing.x1, placing.y1, x2, y2, 5);
          break;
      }

      if (newElm) {
        circuit.addElement(newElm);
        circuit.analyzeCircuit();
        setSelectedId(newElm.id);
      }

      setPlacing(null);
    }
  }, [placing, getWorldPos]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    cameraRef.current.handleWheel(e.nativeEvent, rect);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedId) {
          const circuit = circuitRef.current;
          circuit.removeElement(selectedId);
          circuit.analyzeCircuit();
          setSelectedId(null);
        }
      }
      if (e.key === 'Escape') {
        setPlacing(null);
        setTool('select');
      }
      if (e.key === 'r' || e.key === 'R') setTool('resistor');
      if (e.key === 'w' || e.key === 'W') setTool('wire');
      if (e.key === 'v' || e.key === 'V') setTool('voltage');
      if (e.key === 'g' || e.key === 'G') setTool('ground');
      if (e.key === 's' || e.key === 'S') setTool('select');
      if (e.key === ' ') { e.preventDefault(); setSimRunning(r => !r); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId]);

  // --- Delete handler ---
  const handleDelete = useCallback(() => {
    if (selectedId) {
      circuitRef.current.removeElement(selectedId);
      circuitRef.current.analyzeCircuit();
      setSelectedId(null);
    }
  }, [selectedId]);

  // --- Reset ---
  const handleReset = useCallback(() => {
    circuitRef.current.reset();
    setSimTime(0);
  }, []);

  // --- Property edit ---
  const selectedElm = selectedId ? circuitRef.current.getElement(selectedId) ?? null : null;

  const handlePropChange = useCallback((prop: string, value: number) => {
    if (!selectedElm) return;
    if (selectedElm.type === 'resistor' && prop === 'resistance') {
      (selectedElm as ResistorElement).resistance = value;
    } else if (selectedElm.type === 'voltage' && prop === 'voltage') {
      (selectedElm as VoltageSourceElement).maxVoltage = value;
    } else if (selectedElm.type === 'capacitor' && prop === 'capacitance') {
      (selectedElm as CapacitorElement).capacitance = value;
    } else if (selectedElm.type === 'inductor' && prop === 'inductance') {
      (selectedElm as InductorElement).inductance = value;
    } else if (selectedElm.type === 'switch' && prop === 'closed') {
      (selectedElm as SwitchElement).closed = value === 1;
    }
    circuitRef.current.analyzeCircuit();
  }, [selectedElm]);

  return (
    <div className="flex flex-col h-screen bg-surface-dim text-text-primary overflow-hidden font-sans">
      {/* Top Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        simRunning={simRunning}
        setSimRunning={setSimRunning}
        handleReset={handleReset}
        handleDelete={handleDelete}
        selectedId={selectedId}
        showValues={showValues}
        setShowValues={setShowValues}
        simTime={simTime}
        stopMessage={stopMessage}
      />

      <div className="flex flex-1 overflow-hidden pt-[46px]">
        {/* Left Sidebar (Documentation Navigation & Component Palette) */}
        <aside className="w-[280px] flex-shrink-0 border-r border-border-hairline bg-surface flex flex-col h-full overflow-hidden">
          <SideNavBar />
          <div className="flex-1 overflow-y-auto border-t border-border-hairline">
            <div className="px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] text-text-muted font-bold font-mono">
              Component Palette
            </div>
            <ComponentPalette tool={tool} setTool={setTool} />
          </div>
        </aside>

        {/* Main Document Content Area */}
        <main className="flex-1 overflow-y-auto bg-surface-dim relative scroll-smooth no-scrollbar">
          <div className="max-w-[1000px] mx-auto px-8 md:px-12 py-16 text-left">
            
            {/* Section 1: Introduction */}
            <section id="intro" className="mb-16 scroll-mt-20">
              <header className="mb-8">
                <div className="text-accent font-mono text-[10px] mb-3 uppercase tracking-[0.3em]">Documentation / 1.0 Overview</div>
                <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">
                  Precision Schematic Simulator
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
                  Welcome to the CircuitSim interactive schematic whitepaper. This document functions as both a technical report and an active engineering workstation. The schematic figure embedded below operates in real-time using a direct transient solver.
                </p>
              </header>
            </section>

            {/* Section 2: Simulation Loop */}
            <section id="sim-loop" className="mb-16 scroll-mt-20">
              <article className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                  <span className="text-accent text-sm font-mono">2.0</span>
                  Transient Analysis & Companion Models
                </h2>
                <p className="text-text-secondary mb-6 leading-relaxed">
                  For transient analysis, time-varying components (such as capacitors and inductors) are discretized using numerical integration methods. The standard engine uses the **Trapezoidal Rule** to map differential equations into algebraic equivalents at each timestep <span className="font-mono text-accent">dt</span>.
                </p>

                <div className="bg-surface-bright/20 border border-border-hairline rounded-sm p-5 font-mono text-xs mb-8 overflow-x-auto relative">
                  <div className="absolute top-0 right-0 p-2 text-[8px] text-text-muted uppercase font-bold tracking-widest opacity-40">transient_kernel.ts</div>
                  <pre className="text-text-secondary leading-relaxed">
                    <code>{`export function stepTransient(sim: SimulationState, dt: number): void {
  // Discretize and stamp reactive companion models
  sim.components.forEach(c => {
    if (c.isReactive) {
      c.stampCompanionModel(sim.matrix, dt, sim.previousVoltages);
    }
  });
}`}</code>
                  </pre>
                </div>
              </article>
            </section>

            {/* Section 3: Matrix Math / solver */}
            <section id="matrix-math" className="mb-16 scroll-mt-20">
              <header className="mb-6">
                <div className="text-accent font-mono text-[10px] mb-3 uppercase tracking-[0.3em]">Documentation / 3.0 Solver Matrices</div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                  <span className="text-accent text-sm font-mono">3.0</span>
                  Modified Nodal Analysis & Newton-Raphson
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  The core engine formulates circuit equations via **Modified Nodal Analysis (MNA)**. This approach produces a system of equations in the form:
                </p>
                <div className="my-4 pl-4 border-l-2 border-primary/40 font-mono text-text-primary text-sm">
                  [G] · [v] = [i]
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Where <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[G]</span> is the conductance matrix, <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[v]</span> is the node voltage vector, and <span className="font-mono bg-surface-bright px-1.5 py-0.5 rounded text-xs text-primary border border-border-hairline">[i]</span> is the source vector.
                </p>
                <p className="text-text-secondary mt-4 leading-relaxed">
                  For circuits containing non-linear elements (like diodes), the solver iteratively linearizes each component around its operating point using the **Newton-Raphson method**, converging until the voltage step size falls below <span className="font-mono text-accent">1e-6</span>.
                </p>
              </header>

              {/* Interactive Telemetry Diagnostics Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <SolverMatrixSystem G={matrixG} v={vectorV} i={vectorI} />
                <ConvergenceSparkline errors={nrErrors} />
              </div>

              {/* Active Schematic Canvas Figure */}
              <div className="flex flex-col gap-1.5 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Figure 3.1: Active schematic & live solver environment</span>
                  <div className="flex gap-2">
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-instrument-voltage/10 text-instrument-voltage border border-instrument-voltage/20 uppercase animate-pulse">Live Feed</span>
                  </div>
                </div>

                <div 
                  className="canvas-container aspect-video w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] relative group" 
                  ref={containerRef}
                >
                  <canvas
                    ref={canvasRef}
                    className="circuit-canvas"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerOut={handlePointerUp}
                    onPointerLeave={() => setHoveredElm(null)}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                    style={{ cursor: tool === 'select' ? ( cameraRef.current.panning ? 'grabbing' : 'default') : 'crosshair' }}
                  />

                  {/* Float HUD card on hovered element */}
                  <NodeHUD elm={hoveredElm} position={mousePos} />

                  {/* Canvas Overlay Telemetry HUD */}
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
                </div>
              </div>
            </section>

            {/* Section 4: Component Reference */}
            <section id="comp-ref" className="mb-16 scroll-mt-20">
              <article className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                  <span className="text-accent text-sm font-mono">4.0</span>
                  Component Reference & Equations
                </h2>
                <p className="text-text-secondary mb-6 leading-relaxed">
                  Every circuit component translates to specific mathematical equations within the solver loop:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text-secondary">
                  <div className="p-4 border border-border-hairline bg-surface/30">
                    <div className="text-text-primary font-bold mb-1">Resistor</div>
                    <div>Ohm's Law: V = I · R</div>
                    <div className="mt-1 opacity-70">Stamps 1/R into diagonal coefficients of [G]</div>
                  </div>
                  <div className="p-4 border border-border-hairline bg-surface/30">
                    <div className="text-text-primary font-bold mb-1">Diode / LED</div>
                    <div>Shockley equation: I = I_s · (e^(V_d / (n·V_t)) - 1)</div>
                    <div className="mt-1 opacity-70">Stamps dynamic conductance G_eq and current source I_eq during NR iterations</div>
                  </div>
                  <div className="p-4 border border-border-hairline bg-surface/30">
                    <div className="text-text-primary font-bold mb-1">Capacitor</div>
                    <div>I = C · dV/dt (Trapezoidal integration)</div>
                    <div className="mt-1 opacity-70">Companion model: G_eq = 2C/dt, parallel current source</div>
                  </div>
                  <div className="p-4 border border-border-hairline bg-surface/30">
                    <div className="text-text-primary font-bold mb-1">Inductor</div>
                    <div>V = L · dI/dt (Trapezoidal integration)</div>
                    <div className="mt-1 opacity-70">Companion model: R_eq = 2L/dt, series voltage source</div>
                  </div>
                </div>
              </article>
            </section>

            {/* Quick hint instructions for placing/deleting */}
            {tool !== 'select' && (
              <div className="fixed bottom-[240px] left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface border border-border-hairline text-xs font-mono text-text-primary shadow-xl">
                {tool === 'ground'
                  ? 'Click canvas to place ground reference node'
                  : `Click and drag on canvas to place ${tool}`
                } · Press <kbd className="bg-surface-bright px-1 py-0.5 text-[10px] border border-border-hairline">Esc</kbd> to cancel
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Properties Panel */}
        <aside className="w-[320px] flex-shrink-0 border-l border-border-hairline bg-surface flex flex-col h-full overflow-y-auto no-scrollbar">
          <PropertiesPanel 
            selectedElm={selectedElm} 
            handlePropChange={handlePropChange} 
            probedItems={probedItems}
            setProbedItems={setProbedItems}
          />
        </aside>
      </div>

      {/* Bottom Panel: Oscilloscope View */}
      <footer className="h-[220px] border-t border-border-hairline bg-surface-dim z-40 relative flex-shrink-0">
        <Plotter ref={plotterRef} items={probedItems} />
      </footer>
    </div>
  );
}

// --- Utility: distance from a point to an element's body ---
function distToElement(px: number, py: number, elm: ICircuitElement): number {
  const { x: x1, y: y1, x2, y2 } = elm;
  if (elm.type === 'ground') {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  // Distance from point to line segment
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}

// --- Utility: Snap coordinate to grid ---
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default App;
