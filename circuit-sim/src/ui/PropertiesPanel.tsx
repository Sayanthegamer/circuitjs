import { useState } from 'react';
import type {
  ResistorElement,
  VoltageSourceElement,
  CapacitorElement,
  InductorElement,
  SwitchElement,
} from '../engine';
import { Circuit, CircuitElement } from '../engine';
import { voltageToColor } from '../renderer/voltage-colors';
import { useCircuitStore } from '../stores/circuitStore';
import { useUIStore } from '../stores/uiStore';
import { X } from 'lucide-react';
import type { ProbedItem } from './Plotter';

interface PropertiesPanelInnerProps {
  selectedElm: CircuitElement;
  circuit: Circuit;
  probedItems: ProbedItem[];
  setProbedItems: (items: ProbedItem[]) => void;
  onClose: () => void;
}

function PropertiesPanelInner({
  selectedElm,
  circuit,
  probedItems,
  setProbedItems,
  onClose,
}: PropertiesPanelInnerProps) {
  const [resistanceStr, setResistanceStr] = useState(() =>
    selectedElm.type === 'resistor' ? (selectedElm as ResistorElement).resistance.toString() : ''
  );
  const [voltageStr, setVoltageStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).maxVoltage.toString() : ''
  );
  const [capacitanceStr, setCapacitanceStr] = useState(() =>
    selectedElm.type === 'capacitor' ? (selectedElm as CapacitorElement).capacitance.toString() : ''
  );
  const [inductanceStr, setInductanceStr] = useState(() =>
    selectedElm.type === 'inductor' ? (selectedElm as InductorElement).inductance.toString() : ''
  );

  const isProbed = (prop: 'V1' | 'V2' | 'I' | 'Vdiff') =>
    probedItems.some(p => p.elmId === selectedElm.id && p.prop === prop);

  const toggleProbe = (prop: 'V1' | 'V2' | 'I' | 'Vdiff') => {
    if (isProbed(prop)) {
      setProbedItems(probedItems.filter(p => !(p.elmId === selectedElm.id && p.prop === prop)));
    } else {
      const colors = ['#6366f1', '#1eff1e', '#ffee64', '#ff1e1e', '#00e3fd', '#ec4899', '#8b5cf6'];
      const color = colors[probedItems.length % colors.length];
      setProbedItems([...probedItems, {
        id: `${selectedElm.id}_${prop}`,
        elmId: selectedElm.id,
        prop,
        color
      }]);
    }
  };

  const handlePropChange = (prop: 'resistance' | 'voltage' | 'capacitance' | 'inductance' | 'closed', value: number) => {
    const { pushHistory, saveToLocalStorage } = useCircuitStore.getState();
    pushHistory();

    if (selectedElm.type === 'resistor' && prop === 'resistance') {
      // eslint-disable-next-line react-hooks/immutability
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
    circuit.analyzeCircuit();
    saveToLocalStorage();
  };

  const commitResistance = () => {
    const val = parseFloat(resistanceStr);
    if (isNaN(val) || val <= 0) {
      setResistanceStr((selectedElm as ResistorElement).resistance.toString());
    } else {
      handlePropChange('resistance', val);
      setResistanceStr(val.toString());
    }
  };

  const commitVoltage = () => {
    const val = parseFloat(voltageStr);
    if (isNaN(val)) {
      setVoltageStr((selectedElm as VoltageSourceElement).maxVoltage.toString());
    } else {
      handlePropChange('voltage', val);
      setVoltageStr(val.toString());
    }
  };

  const commitCapacitance = () => {
    const val = parseFloat(capacitanceStr);
    if (isNaN(val) || val <= 0) {
      setCapacitanceStr((selectedElm as CapacitorElement).capacitance.toString());
    } else {
      handlePropChange('capacitance', val);
      setCapacitanceStr(val.toString());
    }
  };

  const commitInductance = () => {
    const val = parseFloat(inductanceStr);
    if (isNaN(val) || val <= 0) {
      setInductanceStr((selectedElm as InductorElement).inductance.toString());
    } else {
      handlePropChange('inductance', val);
      setInductanceStr(val.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, commitFn: () => void) => {
    if (e.key === 'Enter') {
      commitFn();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-text-primary border-l border-border-hairline select-none">
      {/* Header */}
      <div className="p-4 border-b border-border-hairline flex items-center justify-between bg-surface-dim">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">Properties</span>
        </div>
        <button
          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
          onClick={onClose}
          aria-label="Close properties"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {/* Identification */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Identifier</span>
            <span className="font-mono text-xs text-primary font-bold">{selectedElm.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Device Type</span>
            <span className="font-mono text-[9px] text-text-secondary bg-surface-bright/35 px-2 py-0.5 border border-border-hairline">
              {selectedElm.type.toUpperCase()}
            </span>
          </div>
        </section>

        {/* Parameters Section */}
        <section className="space-y-4 pt-4 border-t border-border-hairline">
          <div className="flex items-center gap-2 mb-1">
            <i className="material-icons text-[12px] text-text-muted">tune</i>
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Parameters</span>
          </div>

          <div className="space-y-4">
            {selectedElm.type === 'resistor' && (
              <div className="space-y-1.5 group">
                <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                  Resistance
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={resistanceStr}
                    onChange={(e) => setResistanceStr(e.target.value)}
                    onBlur={commitResistance}
                    onKeyDown={(e) => handleKeyDown(e, commitResistance)}
                    className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                    Ω
                  </span>
                </div>
              </div>
            )}

            {selectedElm.type === 'voltage' && (
              <div className="space-y-1.5 group">
                <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                  Voltage Source
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={voltageStr}
                    onChange={(e) => setVoltageStr(e.target.value)}
                    onBlur={commitVoltage}
                    onKeyDown={(e) => handleKeyDown(e, commitVoltage)}
                    className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                    V
                  </span>
                </div>
              </div>
            )}

            {selectedElm.type === 'capacitor' && (
              <div className="space-y-1.5 group">
                <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                  Capacitance
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={capacitanceStr}
                    onChange={(e) => setCapacitanceStr(e.target.value)}
                    onBlur={commitCapacitance}
                    onKeyDown={(e) => handleKeyDown(e, commitCapacitance)}
                    className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                    F
                  </span>
                </div>
              </div>
            )}

            {selectedElm.type === 'inductor' && (
              <div className="space-y-1.5 group">
                <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                  Inductance
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inductanceStr}
                    onChange={(e) => setInductanceStr(e.target.value)}
                    onBlur={commitInductance}
                    onKeyDown={(e) => handleKeyDown(e, commitInductance)}
                    className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                    H
                  </span>
                </div>
              </div>
            )}

            {selectedElm.type === 'switch' && (
              <div className="flex items-center justify-between bg-surface-dim/40 border border-border-hairline p-3 group hover:border-primary/30 transition-colors">
                <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider group-hover:text-text-primary">
                  Switch State
                </span>
                <button
                  onClick={() => handlePropChange('closed', (selectedElm as SwitchElement).closed ? 0 : 1)}
                  className={`w-14 h-6 border flex items-center justify-center transition-all focus:outline-none cursor-pointer ${
                    (selectedElm as SwitchElement).closed
                      ? 'bg-primary border-primary text-white font-bold'
                      : 'bg-surface-dim border-border-hairline text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    {(selectedElm as SwitchElement).closed ? 'CLOSED' : 'OPEN'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Live Diagnostics & Instrumentation */}
        <section className="space-y-4 pt-4 border-t border-border-hairline">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-instrument-current animate-pulse"></div>
              <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Live Diagnostics</span>
            </div>
            <span className="text-[8px] font-mono text-instrument-current/60">TELEMETRY_ON</span>
          </div>

          <div className="grid gap-2.5">
            {/* V1 Readout */}
            <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center group hover:border-primary/30 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-text-muted uppercase font-bold">Node V₁</span>
                <button
                  onClick={() => toggleProbe('V1')}
                  className={`text-[8px] uppercase font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isProbed('V1') ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <i className="material-icons text-[10px]">
                    {isProbed('V1') ? 'check_circle' : 'add_circle_outline'}
                  </i>
                  {isProbed('V1') ? 'Probed' : 'Probe'}
                </button>
              </div>
              <span
                className="font-mono text-xs font-bold tabular-nums"
                style={{ color: voltageToColor(selectedElm.volts[0] || 0) }}
              >
                {(selectedElm.volts[0] || 0).toFixed(3)} V
              </span>
            </div>

            {selectedElm.getPostCount() > 1 && (
              <>
                {/* V2 Readout */}
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center group hover:border-primary/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-text-muted uppercase font-bold">Node V₂</span>
                    <button
                      onClick={() => toggleProbe('V2')}
                      className={`text-[8px] uppercase font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isProbed('V2') ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <i className="material-icons text-[10px]">
                        {isProbed('V2') ? 'check_circle' : 'add_circle_outline'}
                      </i>
                      {isProbed('V2') ? 'Probed' : 'Probe'}
                    </button>
                  </div>
                  <span
                    className="font-mono text-xs font-bold tabular-nums"
                    style={{ color: voltageToColor(selectedElm.volts[1] || 0) }}
                  >
                    {(selectedElm.volts[1] || 0).toFixed(3)} V
                  </span>
                </div>

                {/* Vdiff Readout */}
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center group hover:border-primary/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-text-muted uppercase font-bold">ΔV (V_drop)</span>
                    <button
                      onClick={() => toggleProbe('Vdiff')}
                      className={`text-[8px] uppercase font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isProbed('Vdiff') ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <i className="material-icons text-[10px]">
                        {isProbed('Vdiff') ? 'check_circle' : 'add_circle_outline'}
                      </i>
                      {isProbed('Vdiff') ? 'Probed' : 'Probe'}
                    </button>
                  </div>
                  <span
                    className="font-mono text-xs font-bold tabular-nums"
                    style={{ color: voltageToColor(selectedElm.getVoltageDiff()) }}
                  >
                    {selectedElm.getVoltageDiff().toFixed(3)} V
                  </span>
                </div>

                {/* Current Readout */}
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center group hover:border-primary/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-text-muted uppercase font-bold">Current (I)</span>
                    <button
                      onClick={() => toggleProbe('I')}
                      className={`text-[8px] uppercase font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isProbed('I') ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <i className="material-icons text-[10px]">
                        {isProbed('I') ? 'check_circle' : 'add_circle_outline'}
                      </i>
                      {isProbed('I') ? 'Probed' : 'Probe'}
                    </button>
                  </div>
                  <span className="font-mono text-xs text-instrument-current font-bold tabular-nums">
                    {(selectedElm.getCurrent() * 1000).toFixed(4)} mA
                  </span>
                </div>

                {/* Power Readout */}
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Power Dissipation</span>
                  <span className="font-mono text-xs text-text-primary font-bold tabular-nums">
                    {Math.abs(selectedElm.getVoltageDiff() * selectedElm.getCurrent() * 1000).toFixed(2)} mW
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-hairline bg-surface-dim/40 flex items-center justify-between text-[8px] font-mono text-text-muted">
        <span>STATUS: SOLVED</span>
        <span>MNA SYSTEM READY</span>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const circuit = useCircuitStore((s) => s.circuit);
  const probedItems = useCircuitStore((s) => s.probedItems);
  const setProbedItems = useCircuitStore((s) => s.setProbedItems);

  const selectedElm = selectedId ? (circuit.getElement(selectedId) as CircuitElement) ?? null : null;

  if (!selectedElm) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center opacity-40 select-none">
        <i className="material-icons text-4xl mb-4 text-text-muted">settings_input_component</i>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted leading-relaxed">
          Select a component<br />to inspect
        </p>
      </div>
    );
  }

  return (
    <PropertiesPanelInner
      key={selectedElm.id}
      selectedElm={selectedElm}
      circuit={circuit}
      probedItems={probedItems}
      setProbedItems={setProbedItems}
      onClose={() => setSelectedId(null)}
    />
  );
}
