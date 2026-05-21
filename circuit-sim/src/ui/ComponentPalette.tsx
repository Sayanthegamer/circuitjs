import React, { useState, useMemo } from 'react';
import { 
  Minus, 
  Activity, 
  Battery, 
  ArrowDownToLine,
  Zap,
  Box,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import type { ToolMode } from '../App';

interface ComponentPaletteProps {
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
}

const CATEGORIES: {
  id: string;
  name: string;
  isOpen: boolean;
  items: {
    mode: ToolMode;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[];
}[] = [
  {
    id: 'basic',
    name: 'Basic Components',
    isOpen: true,
    items: [
      { mode: 'wire' as ToolMode, label: 'Wire', icon: <Minus size={20} />, desc: 'Ideal conductor' },
      { mode: 'resistor' as ToolMode, label: 'Resistor', icon: <Activity size={20} />, desc: 'Limits current flow' },
      { mode: 'switch' as ToolMode, label: 'Switch', icon: <Minus size={20} style={{ strokeDasharray: '4 4' }} />, desc: 'SPST switch' },
      { mode: 'ground' as ToolMode, label: 'Ground', icon: <ArrowDownToLine size={20} />, desc: '0V reference node' },
    ]
  },
  {
    id: 'sources',
    name: 'Sources',
    isOpen: true,
    items: [
      { mode: 'voltage' as ToolMode, label: 'DC Voltage', icon: <Battery size={20} />, desc: 'Constant voltage source' },
    ]
  },
  {
    id: 'passive',
    name: 'Passive Components',
    isOpen: true,
    items: [
      { mode: 'capacitor' as ToolMode, label: 'Capacitor', icon: <Minus size={20} className="rotate-90" />, desc: 'Stores charge' },
      { mode: 'inductor' as ToolMode, label: 'Inductor', icon: <Activity size={20} />, desc: 'Stores flux' },
    ]
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    isOpen: true,
    items: [
      { mode: 'diode' as ToolMode, label: 'Diode', icon: <ChevronRight size={20} />, desc: 'One-way current' },
      { mode: 'led' as ToolMode, label: 'LED', icon: <Zap size={20} />, desc: 'Light-emitting diode' },
    ]
  }
];

export function ComponentPalette({ tool, setTool }: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(CATEGORIES);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c));
  };

  const filteredCategories = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.desc.toLowerCase().includes(lowerQuery)
      )
    })).filter(cat => cat.items.length > 0);
  }, [categories, searchQuery]);

  return (
    <aside className="component-palette">
      <div className="palette-header">
        <h2>Components</h2>
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search parts..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="palette-content">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="palette-category">
            <button 
              className="category-header"
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>{cat.name}</span>
            </button>
            
            {cat.isOpen && (
              <div className="category-items">
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    className={`palette-item ${tool === item.mode ? 'active' : ''}`}
                    onClick={() => setTool(item.mode)}
                  >
                    <div className="item-icon-wrapper">
                      {item.icon}
                    </div>
                    <div className="item-info">
                      <span className="item-label">{item.label}</span>
                      <span className="item-desc">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="no-results">
            <Box size={24} />
            <p>No components found</p>
          </div>
        )}
      </div>
    </aside>
  );
}
