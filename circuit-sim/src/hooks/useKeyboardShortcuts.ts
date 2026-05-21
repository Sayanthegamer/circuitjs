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

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const { circuit, simRunning, setSimRunning } = useCircuitStore.getState();
      const { selectedId, setSelectedId, setPlacing, setTool } = useUIStore.getState();

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedId) {
            e.preventDefault();
            circuit.removeElement(selectedId);
            circuit.analyzeCircuit();
            setSelectedId(null);
          }
          break;
        case 'Escape':
          setPlacing(null);
          setTool('select');
          break;
        case 'r':
        case 'R':
          setTool('resistor');
          break;
        case 'w':
        case 'W':
          setTool('wire');
          break;
        case 'v':
        case 'V':
          setTool('voltage');
          break;
        case 'g':
        case 'G':
          setTool('ground');
          break;
        case 's':
        case 'S':
          setTool('select');
          break;
        case ' ':
          e.preventDefault();
          setSimRunning(!simRunning);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
}
