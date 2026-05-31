import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCircuitStore } from './circuitStore';
import * as engine from '../engine';

vi.mock('../engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine')>();
  return {
    ...actual,
    deserializeCircuit: vi.fn(),
    serializeCircuit: vi.fn(() => 'mocked-serialized-circuit'),
  };
});

describe('circuitStore', () => {
  beforeEach(() => {
    // Mock localStorage to avoid errors in resetSim / saveToLocalStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = (value || '').toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();
    vi.stubGlobal('localStorage', localStorageMock);

    // Reset store state before each test
    const store = useCircuitStore.getState();
    store.resetSim();
    useCircuitStore.setState({ undoStack: [], redoStack: [] });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('importFromJson', () => {
    it('should push history and import successfully', () => {
      const store = useCircuitStore.getState();
      const validJson = '{"elements":[]}';

      const pushHistorySpy = vi.spyOn(store, 'pushHistory');
      const analyzeSpy = vi.spyOn(store.circuit, 'analyzeCircuit');
      const saveSpy = vi.spyOn(store, 'saveToLocalStorage').mockImplementation(() => {});

      const result = useCircuitStore.getState().importFromJson(validJson);

      expect(pushHistorySpy).toHaveBeenCalled();
      expect(engine.deserializeCircuit).toHaveBeenCalledWith(store.circuit, validJson);
      expect(analyzeSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle import failure and return false', () => {
      const store = useCircuitStore.getState();
      const invalidJson = 'invalid';

      const pushHistorySpy = vi.spyOn(store, 'pushHistory');
      const analyzeSpy = vi.spyOn(store.circuit, 'analyzeCircuit');
      const saveSpy = vi.spyOn(store, 'saveToLocalStorage');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(engine.deserializeCircuit).mockImplementationOnce(() => {
        throw new Error('Parse error');
      });

      const result = useCircuitStore.getState().importFromJson(invalidJson);

      expect(pushHistorySpy).toHaveBeenCalled();
      expect(engine.deserializeCircuit).toHaveBeenCalledWith(store.circuit, invalidJson);
      expect(analyzeSpy).not.toHaveBeenCalled();
      expect(saveSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to import JSON:', expect.any(Error));
      expect(result).toBe(false);
    });
  });
});
