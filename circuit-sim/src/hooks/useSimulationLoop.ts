// ============================================================
// useSimulationLoop — rAF render loop with zero React deps
// ============================================================

import { useRef, useEffect } from 'react';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';
import { drawGrid } from '../renderer/grid';
import { drawElement } from '../renderer/element-renderers';
import type { ICircuitElement } from '../engine/types';
import { ResistorElement, VoltageSourceElement } from '../engine';

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
  const uiUpdateCounter = useRef(0);

  useEffect(() => {
    const render = () => {
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

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Read state non-reactively from stores
      const { circuit, camera, simRunning, probedItems, plotterRef } = useCircuitStore.getState();
      const { selectedId, placing, showValues } = useUIStore.getState();

      // --- Simulate ---
      let steps = 0;
      if (simRunning && !circuit.stopMessage) {
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
        const mockElm = {
          type: placing.type, x: placing.x1, y: placing.y1, x2: placing.x2, y2: placing.y2,
          volts: [0, 0], nodes: [0, 0],
          getCurrent: () => 0,
        } as unknown as ICircuitElement;
        drawElement(ctx, mockElm, false, 0, 1);
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
            case 'Vdiff': return e.volts[0] - e.volts[1];
            case 'I': return e.getCurrent();
            default: return 0;
          }
        });
        plotterRef.current.pushData(circuit.t, values);
      }

      // --- Update UI telemetry at ~4Hz ---
      uiUpdateCounter.current++;
      if (uiUpdateCounter.current % 15 === 0) {
        useCircuitStore.getState().updateTelemetry({
          simTime: circuit.t,
          stepsPerFrame: steps,
          stopMessage: circuit.stopMessage,
          matrixG: circuit.lastG && circuit.lastG.length > 0
            ? circuit.lastG.map(row => [...row])
            : [[0]],
          vectorV: circuit.lastV && circuit.lastV.length > 0
            ? [...circuit.lastV]
            : [],
          vectorI: circuit.lastI && circuit.lastI.length > 0
            ? [...circuit.lastI]
            : [],
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
