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
  showHeader?: boolean;
}

function PropertiesPanelInner({
  selectedElm,
  circuit,
  probedItems,
  setProbedItems,
  onClose,
  showHeader = true,
}: PropertiesPanelInnerProps) {
  const [resistanceStr, setResistanceStr] = useState(() =>
    selectedElm.type === 'resistor' ? (selectedElm as ResistorElement).resistance.toString() : ''
  );

  const [waveformStr, setWaveformStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).waveform : 'DC'
  );
  const [frequencyStr, setFrequencyStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).frequency.toString() : '40'
  );

  const [voltageStr, setVoltageStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).maxVoltage.toString() : ''
  );
  const [biasStr, setBiasStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).bias.toString() : '0'
  );
  const [dutyCycleStr, setDutyCycleStr] = useState(() =>
    selectedElm.type === 'voltage' ? (selectedElm as VoltageSourceElement).dutyCycle.toString() : '0.5'
  );
  const [pwlPointsStr, setPwlPointsStr] = useState(() => {
    if (selectedElm.type !== 'voltage') return '';
    const vs = selectedElm as VoltageSourceElement;
    return vs.pwlPoints ? vs.pwlPoints.map(p => `${p.t},${p.v}`).join(' ') : '';
  });
  const [capacitanceStr, setCapacitanceStr] = useState(() =>
    selectedElm.type === 'capacitor' ? (selectedElm as CapacitorElement).capacitance.toString() : ''
  );
  const [inductanceStr, setInductanceStr] = useState(() =>
    selectedElm.type === 'inductor' ? (selectedElm as InductorElement).inductance.toString() : ''
  );
  const [bfStr, setBfStr] = useState(() =>
    selectedElm.type === 'bjt' ? (selectedElm as any).bf.toString() : '100'
  );
  const [isNpnState, setIsNpnState] = useState(() =>
    selectedElm.type === 'bjt' ? (selectedElm as any).isNpn : true
  );
  const [currentValueStr, setCurrentValueStr] = useState(() =>
    selectedElm.type === 'current_source' ? (selectedElm as any).currentValue.toString() : ''
  );
  const [vHighStr, setVHighStr] = useState(() =>
    selectedElm.type === 'logic_gate' ? (selectedElm as any).vHigh.toString() : '5.0'
  );
  const [vLowStr, setVLowStr] = useState(() =>
    selectedElm.type === 'logic_gate' ? (selectedElm as any).vLow.toString() : '0.0'
  );
  const [vThresholdStr, setVThresholdStr] = useState(() =>
    selectedElm.type === 'logic_gate' ? (selectedElm as any).vThreshold.toString() : '2.5'
  );
  const [propagationDelayStr, setPropagationDelayStr] = useState(() =>
    selectedElm.type === 'logic_gate' ? (selectedElm as any).propagationDelay.toString() : '1e-6'
  );
  const [couplingCoefficientStr, setCouplingCoefficientStr] = useState(() =>
    selectedElm.type === 'transformer' ? (selectedElm as any).couplingCoefficient.toString() : '0.99'
  );
  const [inductance1Str, setInductance1Str] = useState(() =>
    selectedElm.type === 'transformer' ? (selectedElm as any).inductance1.toString() : '1.0'
  );
  const [inductance2Str, setInductance2Str] = useState(() =>
    selectedElm.type === 'transformer' ? (selectedElm as any).inductance2.toString() : '1.0'
  );
  const [seriesResistance1Str, setSeriesResistance1Str] = useState(() =>
    selectedElm.type === 'transformer' ? (selectedElm as any).seriesResistance1.toString() : '0.1'
  );
  const [seriesResistance2Str, setSeriesResistance2Str] = useState(() =>
    selectedElm.type === 'transformer' ? (selectedElm as any).seriesResistance2.toString() : '0.1'
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

  const handlePropChange = (
    prop: 'resistance' | 'voltage' | 'capacitance' | 'inductance' | 'closed' | 'waveform' | 'frequency' | 'bf' | 'isNpn' | 'currentValue' | 'vHigh' | 'vLow' | 'vThreshold' | 'propagationDelay' | 'couplingCoefficient' | 'inductance1' | 'inductance2' | 'seriesResistance1' | 'seriesResistance2' | 'bias' | 'dutyCycle' | 'pwlPoints',
    value: any
  ) => {
    const { pushHistory, saveToLocalStorage } = useCircuitStore.getState();
    pushHistory();

    if (selectedElm.type === 'resistor' && prop === 'resistance') {
      // eslint-disable-next-line react-hooks/immutability
      (selectedElm as ResistorElement).resistance = value;

    } else if (selectedElm.type === 'voltage') {
      if (prop === 'waveform') {
        (selectedElm as VoltageSourceElement).waveform = value;
      } else if (prop === 'frequency') {
        (selectedElm as VoltageSourceElement).frequency = value;
      } else if (prop === 'voltage') {
        (selectedElm as VoltageSourceElement).maxVoltage = value;
      } else if (prop === 'bias') {
        (selectedElm as VoltageSourceElement).bias = value;
      } else if (prop === 'dutyCycle') {
        (selectedElm as VoltageSourceElement).dutyCycle = value;
      } else if (prop === 'pwlPoints') {
        (selectedElm as VoltageSourceElement).pwlPoints = value;
      }
    } else if (selectedElm.type === 'capacitor' && prop === 'capacitance') {
      (selectedElm as CapacitorElement).capacitance = value;
    } else if (selectedElm.type === 'inductor' && prop === 'inductance') {
      (selectedElm as InductorElement).inductance = value;
    } else if (selectedElm.type === 'switch' && prop === 'closed') {
      (selectedElm as SwitchElement).closed = value === 1;
    } else if (selectedElm.type === 'bjt' && prop === 'bf') {
      (selectedElm as any).bf = value;
    } else if (selectedElm.type === 'bjt' && prop === 'isNpn') {
      (selectedElm as any).isNpn = value;
    } else if (selectedElm.type === 'current_source' && prop === 'currentValue') {
      (selectedElm as any).currentValue = value;
    } else if (selectedElm.type === 'logic_gate' && prop === 'vHigh') {
      (selectedElm as any).vHigh = value;
    } else if (selectedElm.type === 'logic_gate' && prop === 'vLow') {
      (selectedElm as any).vLow = value;
    } else if (selectedElm.type === 'logic_gate' && prop === 'vThreshold') {
      (selectedElm as any).vThreshold = value;
    } else if (selectedElm.type === 'logic_gate' && prop === 'propagationDelay') {
      (selectedElm as any).propagationDelay = value;
    } else if (selectedElm.type === 'transformer') {
      if (prop === 'couplingCoefficient') {
        (selectedElm as any).couplingCoefficient = value;
      } else if (prop === 'inductance1') {
        (selectedElm as any).inductance1 = value;
      } else if (prop === 'inductance2') {
        (selectedElm as any).inductance2 = value;
      } else if (prop === 'seriesResistance1') {
        (selectedElm as any).seriesResistance1 = value;
      } else if (prop === 'seriesResistance2') {
        (selectedElm as any).seriesResistance2 = value;
      }
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

  const commitCouplingCoefficient = () => {
    let val = parseFloat(couplingCoefficientStr);
    if (isNaN(val)) {
      setCouplingCoefficientStr((selectedElm as any).couplingCoefficient.toString());
    } else {
      val = Math.min(0.99999, Math.max(-0.99999, val));
      handlePropChange('couplingCoefficient', val);
      setCouplingCoefficientStr(val.toString());
    }
  };

  const commitInductance1 = () => {
    const val = parseFloat(inductance1Str);
    if (isNaN(val) || val <= 0) {
      setInductance1Str((selectedElm as any).inductance1.toString());
    } else {
      handlePropChange('inductance1', val);
      setInductance1Str(val.toString());
    }
  };

  const commitInductance2 = () => {
    const val = parseFloat(inductance2Str);
    if (isNaN(val) || val <= 0) {
      setInductance2Str((selectedElm as any).inductance2.toString());
    } else {
      handlePropChange('inductance2', val);
      setInductance2Str(val.toString());
    }
  };

  const commitSeriesResistance1 = () => {
    const val = parseFloat(seriesResistance1Str);
    if (isNaN(val) || val < 0) {
      setSeriesResistance1Str((selectedElm as any).seriesResistance1.toString());
    } else {
      handlePropChange('seriesResistance1', val);
      setSeriesResistance1Str(val.toString());
    }
  };

  const commitSeriesResistance2 = () => {
    const val = parseFloat(seriesResistance2Str);
    if (isNaN(val) || val < 0) {
      setSeriesResistance2Str((selectedElm as any).seriesResistance2.toString());
    } else {
      handlePropChange('seriesResistance2', val);
      setSeriesResistance2Str(val.toString());
    }
  };


  const commitFrequency = () => {
    const val = parseFloat(frequencyStr);
    if (!(Number.isFinite(val) && val > 0)) {
      setFrequencyStr((selectedElm as VoltageSourceElement).frequency.toString());
    } else {
      handlePropChange('frequency', val);
      setFrequencyStr(val.toString());
    }
  };

  const commitWaveform = (wf: 'DC' | 'AC' | 'SQUARE' | 'TRIANGLE' | 'PULSE' | 'PWL') => {
    handlePropChange('waveform', wf);
    setWaveformStr(wf);
  };

  const commitBias = () => {
    const val = parseFloat(biasStr);
    if (isNaN(val)) {
      setBiasStr((selectedElm as VoltageSourceElement).bias.toString());
    } else {
      handlePropChange('bias', val);
      setBiasStr(val.toString());
    }
  };

  const commitDutyCycle = () => {
    const val = parseFloat(dutyCycleStr);
    if (isNaN(val) || val < 0 || val > 1) {
      setDutyCycleStr((selectedElm as VoltageSourceElement).dutyCycle.toString());
    } else {
      handlePropChange('dutyCycle', val);
      setDutyCycleStr(val.toString());
    }
  };

  const commitPwlPoints = () => {
    const parts = pwlPointsStr.trim().split(/\s+/).filter(Boolean);
    const parsedPoints: { t: number; v: number }[] = [];
    let valid = true;
    for (const part of parts) {
      const subparts = part.split(',');
      if (subparts.length !== 2) {
        valid = false;
        break;
      }
      const t = parseFloat(subparts[0]);
      const v = parseFloat(subparts[1]);
      if (isNaN(t) || isNaN(v) || t < 0) {
        valid = false;
        break;
      }
      parsedPoints.push({ t, v });
    }
    parsedPoints.sort((a, b) => a.t - b.t);

    if (!valid) {
      const vs = selectedElm as VoltageSourceElement;
      setPwlPointsStr(vs.pwlPoints ? vs.pwlPoints.map(p => `${p.t},${p.v}`).join(' ') : '');
    } else {
      handlePropChange('pwlPoints', parsedPoints);
      setPwlPointsStr(parsedPoints.map(p => `${p.t},${p.v}`).join(' '));
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

  const commitBf = () => {
    const val = parseFloat(bfStr);
    if (isNaN(val) || val <= 0) {
      setBfStr((selectedElm as any).bf.toString());
    } else {
      handlePropChange('bf', val);
      setBfStr(val.toString());
    }
  };

  const commitCurrentValue = () => {
    const val = parseFloat(currentValueStr);
    if (isNaN(val)) {
      setCurrentValueStr((selectedElm as any).currentValue.toString());
    } else {
      handlePropChange('currentValue', val);
      setCurrentValueStr(val.toString());
    }
  };

  const commitVHigh = () => {
    const val = parseFloat(vHighStr);
    if (isNaN(val)) {
      setVHighStr((selectedElm as any).vHigh.toString());
    } else {
      handlePropChange('vHigh', val);
      setVHighStr(val.toString());
    }
  };

  const commitVLow = () => {
    const val = parseFloat(vLowStr);
    if (isNaN(val)) {
      setVLowStr((selectedElm as any).vLow.toString());
    } else {
      handlePropChange('vLow', val);
      setVLowStr(val.toString());
    }
  };

  const commitVThreshold = () => {
    const val = parseFloat(vThresholdStr);
    if (isNaN(val)) {
      setVThresholdStr((selectedElm as any).vThreshold.toString());
    } else {
      handlePropChange('vThreshold', val);
      setVThresholdStr(val.toString());
    }
  };

  const commitPropagationDelay = () => {
    const val = parseFloat(propagationDelayStr);
    if (isNaN(val) || val < 0) {
      setPropagationDelayStr((selectedElm as any).propagationDelay.toString());
    } else {
      handlePropChange('propagationDelay', val);
      setPropagationDelayStr(val.toString());
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
      {showHeader && (
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
      )}

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

              <>
                {/* Waveform Dropdown Selector */}
                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Waveform
                  </label>
                  <div className="relative">
                    <select
                      value={waveformStr}
                      onChange={(e) => commitWaveform(e.target.value as any)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all text-text-primary cursor-pointer"
                    >
                      <option value="DC" className="bg-surface-dim text-text-primary">DC</option>
                      <option value="AC" className="bg-surface-dim text-text-primary">AC</option>
                      <option value="SQUARE" className="bg-surface-dim text-text-primary">SQUARE</option>
                      <option value="TRIANGLE" className="bg-surface-dim text-text-primary">TRIANGLE</option>
                      <option value="PULSE" className="bg-surface-dim text-text-primary">PULSE</option>
                      <option value="PWL" className="bg-surface-dim text-text-primary">PWL</option>
                    </select>
                  </div>
                </div>

                {/* Voltage Input (Only if not PWL) */}
                {waveformStr !== 'PWL' && (
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                      {waveformStr === 'DC' ? 'Voltage' : 'Peak Voltage'}
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

                {/* Frequency Input (Only if not DC and not PWL) */}
                {waveformStr !== 'DC' && waveformStr !== 'PWL' && (
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                      Frequency
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={frequencyStr}
                        onChange={(e) => setFrequencyStr(e.target.value)}
                        onBlur={commitFrequency}
                        onKeyDown={(e) => handleKeyDown(e, commitFrequency)}
                        className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                        Hz
                      </span>
                    </div>
                  </div>
                )}

                {/* Bias Voltage Input (Only if not DC) */}
                {waveformStr !== 'DC' && (
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                      {waveformStr === 'PWL' ? 'Bias / Fallback Voltage' : 'Bias Voltage'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={biasStr}
                        onChange={(e) => setBiasStr(e.target.value)}
                        onBlur={commitBias}
                        onKeyDown={(e) => handleKeyDown(e, commitBias)}
                        className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                        V
                      </span>
                    </div>
                  </div>
                )}

                {/* Duty Cycle Input (Only if SQUARE or PULSE) */}
                {(waveformStr === 'SQUARE' || waveformStr === 'PULSE') && (
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                      Duty Cycle (0-1)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={dutyCycleStr}
                        onChange={(e) => setDutyCycleStr(e.target.value)}
                        onBlur={commitDutyCycle}
                        onKeyDown={(e) => handleKeyDown(e, commitDutyCycle)}
                        className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                      />
                    </div>
                  </div>
                )}

                {/* PWL Points Input (Only if PWL) */}
                {waveformStr === 'PWL' && (
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                      PWL Points (t1,v1 t2,v2 ...)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={pwlPointsStr}
                        onChange={(e) => setPwlPointsStr(e.target.value)}
                        onBlur={commitPwlPoints}
                        onKeyDown={(e) => handleKeyDown(e, commitPwlPoints)}
                        placeholder="e.g. 0,0 1e-3,5 2e-3,0"
                        className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>
                )}
              </>

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

            {selectedElm.type === 'bjt' && (
              <>
                {/* Type Toggle */}
                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Transistor Type
                  </label>
                  <div className="flex border border-border-hairline bg-surface-dim">
                    <button
                      className={`flex-1 py-1.5 text-xs font-mono transition-all cursor-pointer focus:outline-none ${isNpnState ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:bg-surface-bright/35'}`}
                      onClick={() => {
                        handlePropChange('isNpn', true);
                        setIsNpnState(true);
                      }}
                    >
                      NPN
                    </button>
                    <button
                      className={`flex-1 py-1.5 text-xs font-mono transition-all cursor-pointer focus:outline-none ${!isNpnState ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:bg-surface-bright/35'}`}
                      onClick={() => {
                        handlePropChange('isNpn', false);
                        setIsNpnState(false);
                      }}
                    >
                      PNP
                    </button>
                  </div>
                </div>

                {/* Beta Input */}
                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Forward Beta (β)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bfStr}
                      onChange={(e) => setBfStr(e.target.value)}
                      onBlur={commitBf}
                      onKeyDown={(e) => handleKeyDown(e, commitBf)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                  </div>
                </div>
              </>
            )}

            {selectedElm.type === 'current_source' && (
              <div className="space-y-1.5 group">
                <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                  Current Output
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentValueStr}
                    onChange={(e) => setCurrentValueStr(e.target.value)}
                    onBlur={commitCurrentValue}
                    onKeyDown={(e) => handleKeyDown(e, commitCurrentValue)}
                    className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                    A
                  </span>
                </div>
              </div>
            )}

            {selectedElm.type === 'transformer' && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Primary Inductance (L₁)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inductance1Str}
                      onChange={(e) => setInductance1Str(e.target.value)}
                      onBlur={commitInductance1}
                      onKeyDown={(e) => handleKeyDown(e, commitInductance1)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      H
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Secondary Inductance (L₂)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inductance2Str}
                      onChange={(e) => setInductance2Str(e.target.value)}
                      onBlur={commitInductance2}
                      onKeyDown={(e) => handleKeyDown(e, commitInductance2)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      H
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Coupling Coefficient (k)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={couplingCoefficientStr}
                      onChange={(e) => setCouplingCoefficientStr(e.target.value)}
                      onBlur={commitCouplingCoefficient}
                      onKeyDown={(e) => handleKeyDown(e, commitCouplingCoefficient)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Primary Winding Resistance (R_s1)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={seriesResistance1Str}
                      onChange={(e) => setSeriesResistance1Str(e.target.value)}
                      onBlur={commitSeriesResistance1}
                      onKeyDown={(e) => handleKeyDown(e, commitSeriesResistance1)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      Ω
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Secondary Winding Resistance (R_s2)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={seriesResistance2Str}
                      onChange={(e) => setSeriesResistance2Str(e.target.value)}
                      onBlur={commitSeriesResistance2}
                      onKeyDown={(e) => handleKeyDown(e, commitSeriesResistance2)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      Ω
                    </span>
                  </div>
                </div>
              </>
            )}

            {selectedElm.type === 'logic_gate' && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Gate Type
                  </label>
                  <div className="font-mono text-xs text-text-secondary bg-surface-bright/35 px-3 py-2 border border-border-hairline">
                    {(selectedElm as any).gateType}
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Logic High (V_high)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vHighStr}
                      onChange={(e) => setVHighStr(e.target.value)}
                      onBlur={commitVHigh}
                      onKeyDown={(e) => handleKeyDown(e, commitVHigh)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      V
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Logic Low (V_low)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vLowStr}
                      onChange={(e) => setVLowStr(e.target.value)}
                      onBlur={commitVLow}
                      onKeyDown={(e) => handleKeyDown(e, commitVLow)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      V
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Input Threshold (V_th)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vThresholdStr}
                      onChange={(e) => setVThresholdStr(e.target.value)}
                      onBlur={commitVThreshold}
                      onKeyDown={(e) => handleKeyDown(e, commitVThreshold)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      V
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[9px] text-text-secondary block uppercase font-bold tracking-wider group-hover:text-text-primary transition-colors">
                    Propagation Delay
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={propagationDelayStr}
                      onChange={(e) => setPropagationDelayStr(e.target.value)}
                      onBlur={commitPropagationDelay}
                      onKeyDown={(e) => handleKeyDown(e, commitPropagationDelay)}
                      className="w-full bg-surface-dim border border-border-hairline px-3 py-2 font-mono text-xs focus:border-primary/50 outline-none transition-all placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted pointer-events-none bg-surface-dim pl-1">
                      s
                    </span>
                  </div>
                </div>
              </>
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
            {selectedElm.type === 'bjt' && (
              <>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Collector (V_c)</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor(selectedElm.volts[0] || 0) }}>
                    {(selectedElm.volts[0] || 0).toFixed(3)} V
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Base (V_b)</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor(selectedElm.volts[1] || 0) }}>
                    {(selectedElm.volts[1] || 0).toFixed(3)} V
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Emitter (V_e)</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor(selectedElm.volts[2] || 0) }}>
                    {(selectedElm.volts[2] || 0).toFixed(3)} V
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">V_be / V_bc</span>
                  <span className="font-mono text-xs text-text-secondary font-bold tabular-nums">
                    {((selectedElm.volts[1] || 0) - (selectedElm.volts[2] || 0)).toFixed(3)} V / {((selectedElm.volts[1] || 0) - (selectedElm.volts[0] || 0)).toFixed(3)} V
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Collector Current (I_c)</span>
                  <span className="font-mono text-xs text-instrument-current font-bold tabular-nums">
                    {(selectedElm.getCurrent() * 1000).toFixed(4)} mA
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Base Current (I_b)</span>
                  <span className="font-mono text-xs text-instrument-current font-bold tabular-nums">
                    {((selectedElm as any).getCurrentIntoNode(1) * 1000).toFixed(4)} mA
                  </span>
                </div>
              </>
            )}

            {selectedElm.type === 'logic_gate' && (
              <>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Input 1 (V_in1)</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor(selectedElm.volts[0] || 0) }}>
                    {(selectedElm.volts[0] || 0).toFixed(3)} V ({selectedElm.volts[0] >= (selectedElm as any).vThreshold ? 'HIGH' : 'LOW'})
                  </span>
                </div>
                {(selectedElm as any).gateType !== 'NOT' && (
                  <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                    <span className="text-[8px] text-text-muted uppercase font-bold">Input 2 (V_in2)</span>
                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor(selectedElm.volts[1] || 0) }}>
                      {(selectedElm.volts[1] || 0).toFixed(3)} V ({selectedElm.volts[1] >= (selectedElm as any).vThreshold ? 'HIGH' : 'LOW'})
                    </span>
                  </div>
                )}
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Output (V_out)</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: voltageToColor((selectedElm as any).lastOutVal) }}>
                    {((selectedElm as any).lastOutVal).toFixed(3)} V
                  </span>
                </div>
                <div className="bg-surface-dim border border-border-hairline p-2.5 flex justify-between items-center">
                  <span className="text-[8px] text-text-muted uppercase font-bold">Output Current</span>
                  <span className="font-mono text-xs text-instrument-current font-bold tabular-nums">
                    {(selectedElm.getCurrent() * 1000).toFixed(4)} mA
                  </span>
                </div>
              </>
            )}

            {selectedElm.type !== 'bjt' && selectedElm.type !== 'logic_gate' && (
              <>
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

export function PropertiesPanel({ showHeader }: { showHeader?: boolean }) {
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
      showHeader={showHeader}
    />
  );
}
