import { useEffect } from 'react';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';

export function useKeyboardShortcuts() {
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

      const { circuit, simRunning, setSimRunning } = useCircuitStore.getState();
      const { selectedId, setSelectedId, setPlacing, setTool } = useUIStore.getState();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
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
      if (e.key === ' ') {
        e.preventDefault();
        setSimRunning(!simRunning);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
}
