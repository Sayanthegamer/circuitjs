import { useRef, useEffect, useCallback, useState } from 'react';
import { Circuit, ResistorElement, VoltageSourceElement, WireElement, GroundElement, CapacitorElement, InductorElement, SwitchElement, DiodeElement, LEDElement } from './engine';
import type { ICircuitElement } from './engine/types';
import { Camera } from './renderer/camera';
import { drawGrid, snapToGrid, GRID_SIZE } from './renderer/grid';
import { drawElement, drawGhost } from './renderer/element-renderers';
import { voltageToColor } from './renderer/voltage-colors';
import { Toolbar } from './ui/Toolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { Plotter, type ProbedItem, type PlotterHandle } from './ui/Plotter';
import { StatusBar } from './ui/StatusBar';
import { ComponentPalette } from './ui/ComponentPalette';
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
  const uiUpdateCounter = useRef(0);

  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(true);
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [probedItems, setProbedItems] = useState<ProbedItem[]>([]);
  const plotterRef = useRef<PlotterHandle>(null);
  const [simTime, setSimTime] = useState(0);
  const [stepsPerFrame, setStepsPerFrame] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(true);

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

    // Build a demo circuit: 5V → R1(1kΩ) → R2(1kΩ) → GND
    const circuit = circuitRef.current;
    // Clear previous elements (handles React StrictMode double-mount)
    circuit.elements = [];
    circuit.stopMessage = null;

    const vs  = new VoltageSourceElement(0, 160, 0, 0, 5);
    const r1  = new ResistorElement(0, 0, 160, 0, 1000);
    const r2  = new ResistorElement(160, 0, 160, 160, 1000);
    const w1  = new WireElement(160, 160, 0, 160);
    const gnd = new GroundElement(0, 160);

    circuit.addElement(vs);
    circuit.addElement(r1);
    circuit.addElement(r2);
    circuit.addElement(w1);
    circuit.addElement(gnd);

    circuit.analyzeCircuit();


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
        drawGhost(ctx, curPlacing.type, curPlacing.x1, curPlacing.y1, curPlacing.x2, curPlacing.y2);
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

      // Update UI state at ~4Hz to avoid excessive re-renders
      uiUpdateCounter.current++;
      if (uiUpdateCounter.current % 15 === 0) {
        setSimTime(circuit.t);
        setStepsPerFrame(steps);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [probedItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Mouse Handlers ---
  const getWorldPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return cameraRef.current.screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Middle-click or right-click: start panning
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      cameraRef.current.startPan(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Left-click
    if (e.button === 0) {
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
        setSelectedId(found ? found.id : null);
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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Panning
    if (cameraRef.current.panning) {
      cameraRef.current.updatePan(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Placing element
    if (placing && placing.phase === 'second') {
      const world = getWorldPos(e);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };
      setPlacing(prev => prev ? { ...prev, x2: snapped.x, y2: snapped.y } : null);
      return;
    }

    // Hover info
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
        const v = found.volts;
        const i = found.getCurrent();
        let info = `${found.type}`;
        if (found.type === 'resistor') info += ` ${(found as ResistorElement).resistance}Ω`;
        if (found.type === 'voltage') info += ` ${(found as VoltageSourceElement).maxVoltage}V`;
        info += ` | V: ${v[0]?.toFixed(2)}→${v[1]?.toFixed(2)}V | I: ${(i * 1000).toFixed(3)}mA`;
        setHoverInfo(info);
      } else {
        setHoverInfo(null);
      }
    }
  }, [placing, getWorldPos, tool]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // End panning
    if (e.button === 1 || e.button === 2) {
      cameraRef.current.endPan();
      return;
    }

    // Finish placing element
    if (placing && placing.phase === 'second') {
      const world = getWorldPos(e);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };
      const x2 = snapped.x;
      const y2 = snapped.y;

      // Don't create zero-length elements
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
          newElm.capacitance = 1e-3; // 1mF for visible animation
          break;
        case 'inductor':
          newElm = new InductorElement(placing.x1, placing.y1, x2, y2);
          newElm.inductance = 1; // 1H
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
      if (e.key === 'Delete' || e.key === 'Backspace') {
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
  const selectedElm = selectedId ? circuitRef.current.getElement(selectedId) : null;

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
    <div className="app">
      {/* Toolbar */}
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
        probedItems={probedItems}
        setProbedItems={setProbedItems}
      />

      <div className="main-content">
        <ComponentPalette tool={tool} setTool={setTool} />

        <div className="workspace">
          {/* Canvas */}
          <div className="canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="circuit-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
            style={{ cursor: tool === 'select' ? (cameraRef.current.panning ? 'grabbing' : 'default') : 'crosshair' }}
          />

          {/* Hover tooltip */}
          {hoverInfo && (
            <div className="hover-tooltip">
              {hoverInfo}
            </div>
          )}
        </div>
        
        <Plotter ref={plotterRef} items={probedItems} />
        </div>

        {/* Status bar */}
        <StatusBar 
          simRunning={simRunning}
          stopMessage={circuitRef.current.stopMessage}
          simTime={simTime}
          stepsPerFrame={stepsPerFrame}
        />

        {/* Tool hint */}
        {tool !== 'select' && (
          <div className="tool-hint">
            {tool === 'ground'
              ? 'Click to place ground'
              : `Click and drag to place ${tool}`
            } · Press Esc to cancel
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <PropertiesPanel 
        selectedElm={selectedElm} 
        handlePropChange={handlePropChange} 
        probedItems={probedItems}
        setProbedItems={setProbedItems}
      />
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

export default App;
