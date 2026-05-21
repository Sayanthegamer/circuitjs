import type { ICircuitElement } from '../engine/types';
import type { ResistorElement, VoltageSourceElement, CapacitorElement, InductorElement, SwitchElement } from '../engine';
import { voltageToColor } from '../renderer/voltage-colors';
import { TrendingUp } from 'lucide-react';
import { type ProbedItem } from './Plotter';

interface PropertiesPanelProps {
  selectedElm: ICircuitElement | null;
  handlePropChange: (prop: string, value: number) => void;
  probedItems: ProbedItem[];
  setProbedItems: (items: ProbedItem[]) => void;
  onClose?: () => void;
}

import { X } from 'lucide-react';

export function PropertiesPanel({ 
  selectedElm, 
  handlePropChange, 
  probedItems, 
  setProbedItems,
  onClose
}: PropertiesPanelProps) {
  if (!selectedElm) return null;

  const isProbed = (prop: string) => probedItems.some(p => p.elmId === selectedElm.id && p.prop === prop);

  const toggleProbe = (prop: string) => {
    if (isProbed(prop)) {
      setProbedItems(probedItems.filter(p => !(p.elmId === selectedElm.id && p.prop === prop)));
    } else {
      const colors = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];
      const color = colors[probedItems.length % colors.length];
      setProbedItems([...probedItems, {
        id: `${selectedElm.id}_${prop}`,
        elmId: selectedElm.id,
        prop: prop as ProbedItem['prop'],
        color
      }]);
    }
  };

  return (
    <div className="props-panel">
      <div className="props-title">
        <span>{selectedElm.type.charAt(0).toUpperCase() + selectedElm.type.slice(1)} Properties</span>
        {onClose && (
          <button className="props-close-btn" onClick={onClose} aria-label="Close properties">
            <X size={16} />
          </button>
        )}
      </div>

      {selectedElm.type === 'resistor' && (
        <label className="prop-field">
          <span>Resistance (Ω)</span>
          <input
            type="number"
            min={1}
            step={100}
            value={(selectedElm as ResistorElement).resistance}
            onChange={(e) => handlePropChange('resistance', Number(e.target.value))}
          />
        </label>
      )}

      {selectedElm.type === 'voltage' && (
        <label className="prop-field">
          <span>Voltage (V)</span>
          <input
            type="number"
            step={0.5}
            value={(selectedElm as VoltageSourceElement).maxVoltage}
            onChange={(e) => handlePropChange('voltage', Number(e.target.value))}
          />
        </label>
      )}

      {selectedElm.type === 'capacitor' && (
        <label className="prop-field">
          <span>Capacitance (F)</span>
          <input
            type="number"
            step={1e-6}
            value={(selectedElm as CapacitorElement).capacitance}
            onChange={(e) => handlePropChange('capacitance', Number(e.target.value))}
          />
        </label>
      )}

      {selectedElm.type === 'inductor' && (
        <label className="prop-field">
          <span>Inductance (H)</span>
          <input
            type="number"
            step={0.1}
            value={(selectedElm as InductorElement).inductance}
            onChange={(e) => handlePropChange('inductance', Number(e.target.value))}
          />
        </label>
      )}

      {selectedElm.type === 'switch' && (
        <label className="prop-field checkbox-field">
          <span>Closed</span>
          <input
            type="checkbox"
            checked={(selectedElm as SwitchElement).closed}
            onChange={(e) => handlePropChange('closed', e.target.checked ? 1 : 0)}
          />
        </label>
      )}

      <div className="prop-readouts">
        <div className="readout">
          <span className="readout-label">V₁</span>
          <span className="readout-value" style={{ color: voltageToColor(selectedElm.volts[0] || 0) }}>
            {(selectedElm.volts[0] || 0).toFixed(3)}V
          </span>
          <button 
            className={`probe-btn ${isProbed('V1') ? 'active' : ''}`}
            onClick={() => toggleProbe('V1')}
            title="Probe Voltage 1"
          >
            <TrendingUp size={12} />
          </button>
        </div>
        <div className="readout">
          <span className="readout-label">V₂</span>
          <span className="readout-value" style={{ color: voltageToColor(selectedElm.volts[1] || 0) }}>
            {(selectedElm.volts[1] || 0).toFixed(3)}V
          </span>
          <button 
            className={`probe-btn ${isProbed('V2') ? 'active' : ''}`}
            onClick={() => toggleProbe('V2')}
            title="Probe Voltage 2"
          >
            <TrendingUp size={12} />
          </button>
        </div>
        <div className="readout">
          <span className="readout-label">ΔV</span>
          <span className="readout-value" style={{ color: voltageToColor(selectedElm.getVoltageDiff()) }}>
            {selectedElm.getVoltageDiff().toFixed(3)}V
          </span>
          <button 
            className={`probe-btn ${isProbed('Vdiff') ? 'active' : ''}`}
            onClick={() => toggleProbe('Vdiff')}
            title="Probe Voltage Difference"
          >
            <TrendingUp size={12} />
          </button>
        </div>
        <div className="readout">
          <span className="readout-label">I</span>
          <span className="readout-value current">
            {(selectedElm.getCurrent() * 1000).toFixed(4)} mA
          </span>
          <button 
            className={`probe-btn ${isProbed('I') ? 'active' : ''}`}
            onClick={() => toggleProbe('I')}
            title="Probe Current"
          >
            <TrendingUp size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

