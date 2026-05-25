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

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            useCircuitStore.getState().redo();
          } else {
            useCircuitStore.getState().undo();
          }
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          useCircuitStore.getState().redo();
          return;
        }
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const { circuit, simRunning, setSimRunning } = useCircuitStore.getState();
      const { selectedIds = [], setSelectedIds, setPlacing, setTool } = useUIStore.getState();

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedIds.length > 0) {
            e.preventDefault();
            const { pushHistory, saveToLocalStorage } = useCircuitStore.getState();
            pushHistory();
            for (const id of selectedIds) {
              circuit.removeElement(id);
            }
            circuit.analyzeCircuit();
            saveToLocalStorage();
            setSelectedIds([]);
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
