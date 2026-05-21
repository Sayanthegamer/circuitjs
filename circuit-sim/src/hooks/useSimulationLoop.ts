// ============================================================
// useSimulationLoop — rAF render loop with zero React deps
// ============================================================

import { useRef, useEffect } from 'react';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';
import { drawGrid } from '../renderer/grid';
import { drawElement } from '../renderer/element-renderers';
import type { ICircuitElement } from '../engine/types';
import { ResistorElement, VoltageSourceElement, CapacitorElement, InductorElement } from '../engine';

/**
 * The core simulation + rendering loop.
 * Reads all state via store.getState() — never subscribes to React state.
 * Dependency array is [] so the rAF loop mounts once and never re-creates.
 */
export function useSimulationLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const rafRef = useRef(0);
  const animTimeRef = useRef(0);
  
  const ghostElmRef = useRef<ICircuitElement>({
    id: 'ghost',
    type: 'wire',
    x: 0,
    y: 0,
    x2: 0,
    y2: 0,
    volts: [0, 0],
    nodes: [0, 0],
    getCurrent: () => 0,
    stamp: () => {},
    startIteration: () => {},
    doStep: () => {},
    calculateCurrent: () => {},
    reset: () => {},
  } as unknown as ICircuitElement);

  useEffect(() => {
    let lastTime = 0;
    let elapsedTelemetry = 0;

    const render = (time: DOMHighResTimeStamp) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      let dt = lastTime !== 0 ? (time - lastTime) / 1000 : 1 / 60;
      lastTime = time;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Read state non-reactively from stores
      const { circuit, camera, simRunning, probedItems, plotterRef } = useCircuitStore.getState();
      const { selectedId, placing, showValues } = useUIStore.getState();

      // --- Simulate ---
      let steps = 0;
      const needTelemetryUpdate = elapsedTelemetry + dt >= 0.25;
      if (simRunning && !circuit.stopMessage) {
        const stepSize = circuit.maxTimeStep > 0 ? circuit.maxTimeStep : 1e-4;
        const targetSteps = Math.round(dt / stepSize);
        const maxSteps = Math.max(1, Math.min(targetSteps, 2000));
        for (let i = 0; i < maxSteps; i++) {
          const captureTelemetry = needTelemetryUpdate && (i === maxSteps - 1);
          if (!circuit.runStep(captureTelemetry)) break;
          steps++;
        }
      }

      // Advance animation time
      animTimeRef.current += dt;

      // Update camera interpolation
      camera.update();

      // --- Draw ---
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
      for (const elm of circuit.elements) {
        const isSelected = elm.id === selectedId;
        drawElement(ctx, elm, isSelected, animTimeRef.current, camera.zoom);
      }

      // Draw value labels
      if (showValues && camera.zoom > 0.4) {
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
          } else if (elm.type === 'capacitor') {
            const c = (elm as CapacitorElement).capacitance;
            label = c >= 1e-3 ? `${(c * 1000).toFixed(1)}mF` : c >= 1e-6 ? `${(c * 1e6).toFixed(1)}µF` : c >= 1e-9 ? `${(c * 1e9).toFixed(1)}nF` : `${(c * 1e12).toFixed(1)}pF`;
          } else if (elm.type === 'inductor') {
            const ind = (elm as InductorElement).inductance;
            label = ind >= 1 ? `${ind.toFixed(1)}H` : ind >= 1e-3 ? `${(ind * 1000).toFixed(1)}mH` : `${(ind * 1e6).toFixed(1)}µH`;
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
      if (placing && placing.phase === 'second') {
        ctx.globalAlpha = 0.4;
        const ghost = ghostElmRef.current;
        ghost.type = placing.type;
        ghost.x = placing.x1;
        ghost.y = placing.y1;
        ghost.x2 = placing.x2;
        ghost.y2 = placing.y2;
        drawElement(ctx, ghost, false, 0, 1);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // --- Update Plotter ---
      if (plotterRef.current && probedItems.length > 0) {
        const values = probedItems.map(item => {
          const e = circuit.getElement(item.elmId);
          if (!e) return 0;
          switch (item.prop) {
            case 'V1': return e.volts[0];
            case 'V2': return e.volts[1];
            case 'Vdiff': return e.getVoltageDiff();
            case 'I': return e.getCurrent();
            default: return 0;
          }
        });
        plotterRef.current.pushData(circuit.t, values);
      }

      // --- Update UI telemetry ---
      elapsedTelemetry += dt;
      if (elapsedTelemetry >= 0.25) {
        elapsedTelemetry = 0;
        const tooLarge = circuit.lastG && circuit.lastG.length > 50;
        useCircuitStore.getState().updateTelemetry({
          simTime: circuit.t,
          stepsPerFrame: steps,
          stopMessage: circuit.stopMessage,
          matrixG: tooLarge
            ? []
            : (circuit.lastG && circuit.lastG.length > 0 ? circuit.lastG.map(row => [...row]) : [[0]]),
          vectorV: tooLarge
            ? []
            : (circuit.lastV && circuit.lastV.length > 0 ? [...circuit.lastV] : []),
          vectorI: tooLarge
            ? []
            : (circuit.lastI && circuit.lastI.length > 0 ? [...circuit.lastI] : []),
          nrErrors: circuit.lastErrors && circuit.lastErrors.length > 0
            ? [...circuit.lastErrors]
            : [],
        });
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
