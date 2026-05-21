import React, { useRef, useCallback } from 'react';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore, lastMousePos } from '../stores/uiStore';
import type { ICircuitElement } from '../engine/types';
import {
  ResistorElement,
  VoltageSourceElement,
  WireElement,
  GroundElement,
  CapacitorElement,
  InductorElement,
  SwitchElement,
  DiodeElement,
  LEDElement,
} from '../engine';
import { GRID_SIZE } from '../renderer/grid';

interface PointerSnapshot {
  pointerId: number;
  clientX: number;
  clientY: number;
  pointerType: string;
  isPrimary: boolean;
}

const coarseMql = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)') : null;

// --- Utility: distance from a point to an element's body ---
function distToElement(px: number, py: number, elm: ICircuitElement): number {
  const { x: x1, y: y1, x2, y2 } = elm;
  if (elm.type === 'ground') {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
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

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const activePointers = useRef(new Map<number, PointerSnapshot>());
  const lastPinchDist = useRef<number | null>(null);

  const getWorldPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { camera } = useCircuitStore.getState();
    return camera.screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }, [canvasRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to canvas
    canvas.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerType: e.pointerType,
      isPrimary: e.isPrimary,
    });

    const rect = canvas.getBoundingClientRect();
    const { camera, circuit } = useCircuitStore.getState();
    const { tool, setSelectedId, setPlacing, setTool } = useUIStore.getState();

    if (activePointers.current.size === 2) {
      // Start two-finger gesture
      const pointers = Array.from(activePointers.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const midX = (p1.clientX + p2.clientX) / 2 - rect.left;
      const midY = (p1.clientY + p2.clientY) / 2 - rect.top;

      camera.startPan(midX, midY);

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
      camera.startPan(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Force clear panning if it somehow got stuck before resetting it on this pointer down
    if (camera.panning) {
      camera.endPan();
    }

    // Left-click or single touch
    if (e.pointerType === 'mouse' ? e.button === 0 : e.isPrimary) {
      const world = getWorldPos(e);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };

      if (tool === 'select') {
        // Try to find an element near click
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
          camera.startPan(e.clientX - rect.left, e.clientY - rect.top);
        }
      } else if (tool === 'ground') {
        const { pushHistory, saveToLocalStorage } = useCircuitStore.getState();
        pushHistory();
        // Ground is single-click placement
        const gnd = new GroundElement(snapped.x, snapped.y);
        circuit.addElement(gnd);
        circuit.analyzeCircuit();
        saveToLocalStorage();
        setSelectedId(gnd.id);
        setTool('select');
      } else {
        // Start placing a 2-post element
        setPlacing({
          type: tool,
          x1: snapped.x,
          y1: snapped.y,
          x2: snapped.x,
          y2: snapped.y,
          phase: 'second',
        });
      }
    }
  }, [canvasRef, getWorldPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
      });
    }

    const { camera, circuit } = useCircuitStore.getState();
    const { tool, placing, setPlacing, setHoveredElm } = useUIStore.getState();

    // Track mouse coordinates for NodeHUD non-reactively
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
    const hudEl = document.getElementById('node-hud');
    if (hudEl) {
      hudEl.style.left = `${e.clientX + 16}px`;
      hudEl.style.top = `${e.clientY + 16}px`;
    }

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
             camera.handleTouchZoom(delta, midX, midY);
         }
      }

      lastPinchDist.current = dist;

      if (camera.panning) {
          camera.updatePan(midX, midY);
      }

      return;
    }

    // Single pointer move
    // Panning
    if (camera.panning) {
      if (activePointers.current.size === 1 || e.pointerType === 'mouse') {
        camera.updatePan(e.clientX - rect.left, e.clientY - rect.top);
      }
      return;
    }

    // Placing element
    if (placing && placing.phase === 'second') {
      const world = getWorldPos(e);
      let yOffset = 0;
      if (coarseMql?.matches) {
          yOffset = -40; // coarse pointer fat-finger offset
      }
      let finalWorld = world;
      if (yOffset !== 0) {
          finalWorld = camera.screenToWorld(
              e.clientX - rect.left,
              e.clientY - rect.top + yOffset
          );
      }

      const snapped = { x: snapToGrid(finalWorld.x), y: snapToGrid(finalWorld.y) };
      setPlacing({ ...placing, x2: snapped.x, y2: snapped.y });
      return;
    }

    // Hover info & element tracking for NodeHUD
    if (tool === 'select') {
      const world = getWorldPos(e);
      let found: ICircuitElement | null = null;
      let bestDist = 15;
      for (const elm of circuit.elements) {
        const d = distToElement(world.x, world.y, elm);
        if (d < bestDist) { bestDist = d; found = elm; }
      }
      setHoveredElm(found);
    } else {
      setHoveredElm(null);
    }
  }, [canvasRef, getWorldPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }

    const { camera, circuit } = useCircuitStore.getState();
    const { placing, setPlacing, setSelectedId } = useUIStore.getState();

    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2)) {
      camera.endPan();
      return;
    } else if (activePointers.current.size === 0 && camera.panning) {
      camera.endPan();
    } else if (activePointers.current.size === 1 && camera.panning) {
      camera.endPan();
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

      let newElm: ICircuitElement | null = null;

      switch (placing.type) {
        case 'wire':
          newElm = new WireElement(placing.x1, placing.y1, x2, y2);
          break;
        case 'resistor':
          newElm = new ResistorElement(placing.x1, placing.y1, x2, y2, 1000);
          break;
        case 'capacitor':
          newElm = new CapacitorElement(placing.x1, placing.y1, x2, y2, 1e-3);
          break;
        case 'inductor':
          newElm = new InductorElement(placing.x1, placing.y1, x2, y2, 1);
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
        const { pushHistory, saveToLocalStorage } = useCircuitStore.getState();
        pushHistory();
        circuit.addElement(newElm);
        circuit.analyzeCircuit();
        saveToLocalStorage();
        setSelectedId(newElm.id);
      }

      setPlacing(null);
    }
  }, [getWorldPos]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { camera } = useCircuitStore.getState();
    camera.handleWheel(e.nativeEvent, rect);
  }, [canvasRef]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleContextMenu,
  };
}
