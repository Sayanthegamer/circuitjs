import { renderHook } from '@testing-library/react';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';
import { beforeEach, describe, it, expect, vi, type Mock } from 'vitest';
import { WireElement } from '../engine';
import { GRID_SIZE } from '../renderer/grid';

// Mock window.matchMedia before importing hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('useCanvasInteraction', () => {
  let canvasRef: { current: HTMLCanvasElement | null };
  let mockGetBoundingClientRect: Mock;

  beforeEach(() => {
    mockGetBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    });

    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = mockGetBoundingClientRect;
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();

    canvasRef = { current: canvas };

    // Reset Zustand stores
    const { camera, circuit } = useCircuitStore.getState();
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
    circuit.clearElements();

    useUIStore.setState({
      tool: 'select',
      placing: null,
      selectedIds: [],
      draggingElmId: null,
      draggingNode: null,
      selectionBox: null,
    });
  });

  it('should initialize without crashing', () => {
    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));
    expect(result.current.handlePointerDown).toBeDefined();
    expect(result.current.handlePointerMove).toBeDefined();
    expect(result.current.handlePointerUp).toBeDefined();
  });

  it('should start panning on middle mouse button down', () => {
    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    const event = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 1,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(event);

    const { camera } = useCircuitStore.getState();
    expect(camera.panning).toBe(true);
    expect(canvasRef.current?.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('should start selection box on left mouse drag in select mode', () => {
    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    // Initial state before pointer down
    expect(useUIStore.getState().selectionBox).toBeNull();

    const eventDown = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0, // Left click
      clientX: 50,
      clientY: 50,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(eventDown);

    // After pointer down, selection box should be initialized
    expect(useUIStore.getState().selectionBox).toEqual({
      x1: 50,
      y1: 50,
      x2: 50,
      y2: 50,
    });

    // Move
    const moveEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 150,
      clientY: 150,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerMove(moveEvent);

    const selectionBox = useUIStore.getState().selectionBox;
    expect(selectionBox).toEqual({
      x1: 50,
      y1: 50,
      x2: 150,
      y2: 150,
    });

    // Up
    const upEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 150,
      clientY: 150,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerUp(upEvent);

    // Should clear selection box
    expect(useUIStore.getState().selectionBox).toBeNull();
  });

  it('should start placing an element on pointer down if tool is not select', () => {
    useUIStore.setState({ tool: 'resistor' });

    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    const snapPt = Math.round(100 / GRID_SIZE) * GRID_SIZE; // 96

    const event = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(event);

    const placing = useUIStore.getState().placing;
    expect(placing).not.toBeNull();
    expect(placing?.type).toBe('resistor');
    expect(placing?.phase).toBe('second');

    // Snaps to grid
    expect(placing?.x1).toBe(snapPt);
    expect(placing?.y1).toBe(snapPt);
  });

  it('should drag an element if pointer goes down on it', () => {
    const { circuit } = useCircuitStore.getState();
    const snapStart = Math.round(10 / GRID_SIZE) * GRID_SIZE; // 16
    const snapEnd = Math.round(50 / GRID_SIZE) * GRID_SIZE; // 48
    const wire = new WireElement(snapStart, snapStart, snapEnd, snapEnd);
    circuit.addElement(wire);

    // Hover over elm
    useUIStore.setState({ hoveredElm: wire });

    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    const eventDown = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 30, // in middle of wire
      clientY: 30,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(eventDown);

    expect(useUIStore.getState().draggingElmId).toBe(wire.id);
    expect(useUIStore.getState().draggingNode).toBeNull(); // Dragging entire element

    const moveEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 50,
      clientY: 50,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerMove(moveEvent);

    const dx = 50 - 30; // 20
    const dy = 50 - 30; // 20

    const expectedX1 = Math.round((snapStart + dx) / GRID_SIZE) * GRID_SIZE; // 32
    const expectedY1 = Math.round((snapStart + dy) / GRID_SIZE) * GRID_SIZE; // 32
    const expectedX2 = Math.round((snapEnd + dx) / GRID_SIZE) * GRID_SIZE;   // 64
    const expectedY2 = Math.round((snapEnd + dy) / GRID_SIZE) * GRID_SIZE;   // 64

    expect(wire.x).toBe(expectedX1);
    expect(wire.y).toBe(expectedY1);
    expect(wire.x2).toBe(expectedX2);
    expect(wire.y2).toBe(expectedY2);
  });

  it('should drag a node if hoveredNode is set', () => {
    const { circuit } = useCircuitStore.getState();
    const snapStart = Math.round(10 / GRID_SIZE) * GRID_SIZE; // 16
    const snapEnd = Math.round(50 / GRID_SIZE) * GRID_SIZE; // 48
    const wire = new WireElement(snapStart, snapStart, snapEnd, snapEnd);
    circuit.addElement(wire);

    // Hover over elm node 0
    useUIStore.setState({ hoveredElm: wire, hoveredNode: 0 });

    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    const eventDown = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 10,
      clientY: 10,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(eventDown);

    expect(useUIStore.getState().draggingElmId).toBe(wire.id);
    expect(useUIStore.getState().draggingNode).toBe(0); // Dragging node 0

    const moveEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 20,
      clientY: 20,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerMove(moveEvent);

    const dx = 20 - 10;
    const dy = 20 - 10;

    const expectedX1 = Math.round((snapStart + dx) / GRID_SIZE) * GRID_SIZE; // 32
    const expectedY1 = Math.round((snapStart + dy) / GRID_SIZE) * GRID_SIZE; // 32

    expect(wire.x).toBe(expectedX1);
    expect(wire.y).toBe(expectedY1);
    // Node 1 should be unchanged
    expect(wire.x2).toBe(snapEnd);
    expect(wire.y2).toBe(snapEnd);
  });

  it('should finish placing element on pointer up', () => {
    useUIStore.setState({ tool: 'resistor' });

    const { result } = renderHook(() => useCanvasInteraction(canvasRef as any));

    // Down
    const eventDown = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerDown(eventDown);

    // Move
    const eventMove = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 150,
      clientY: 150,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerMove(eventMove);

    // Up
    const eventUp = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 150,
      clientY: 150,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;

    result.current.handlePointerUp(eventUp);

    const { circuit } = useCircuitStore.getState();
    const { placing } = useUIStore.getState();

    expect(placing).toBeNull();
    expect(circuit.elements.length).toBe(1);
    expect(circuit.elements[0].type).toBe('resistor');

    const snapStart = Math.round(100 / GRID_SIZE) * GRID_SIZE; // 96
    const snapEnd = Math.round(150 / GRID_SIZE) * GRID_SIZE;   // 144

    expect(circuit.elements[0].x).toBe(snapStart);
    expect(circuit.elements[0].y).toBe(snapStart);
    expect(circuit.elements[0].x2).toBe(snapEnd);
    expect(circuit.elements[0].y2).toBe(snapEnd);
  });

});
