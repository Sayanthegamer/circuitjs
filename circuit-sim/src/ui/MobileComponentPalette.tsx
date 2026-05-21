import { useState, useMemo } from 'react';
import {
  Box,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  MousePointer2,
} from 'lucide-react';
import { useUIStore, type ToolMode } from '../stores/uiStore';
import { CATEGORIES } from './componentCategories';

export const MobileComponentPalette: React.FC = () => {
  const mobilePaletteOpen = useUIStore((s) => s.mobilePaletteOpen);
  const setMobilePaletteOpen = useUIStore((s) => s.setMobilePaletteOpen);
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);

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

  if (!mobilePaletteOpen) return null;

  const handleSelect = (mode: ToolMode) => {
    setTool(mode);
    setMobilePaletteOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={() => setMobilePaletteOpen(false)}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[65vh] flex flex-col bg-surface border-t border-border-hairline shadow-[0_-8px_32px_rgba(0,0,0,0.4)] animate-slide-up">
        {/* Drag Handle */}
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-1 bg-surface-bright rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-border-hairline">
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Components</span>
          <button
            onClick={() => setMobilePaletteOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative flex items-center bg-surface-dim border border-border-hairline px-3 py-2">
            <Search size={14} className="text-text-muted mr-2" />
            <input
              type="text"
              placeholder="Search parts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-text-primary placeholder-text-muted focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {/* Select Tool — always visible at the top */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleSelect('select')}
              className={`flex flex-col items-center justify-center aspect-square bg-surface-dim border p-2 transition-all text-center rounded-none focus:outline-none active:scale-95 ${
                tool === 'select'
                  ? 'border-primary bg-surface-bright text-primary font-bold shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'border-border-hairline text-text-secondary hover:border-text-secondary/50 hover:bg-surface-bright/50 hover:text-text-primary'
              }`}
            >
              <div className="mb-1.5">
                <MousePointer2 size={16} />
              </div>
              <span className="text-[9px] font-mono tracking-wider uppercase font-bold">Select</span>
            </button>
          </div>

          {filteredCategories.map(cat => (
            <div key={cat.id} className="space-y-2">
              <button
                className="w-full flex items-center gap-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary focus:outline-none"
                onClick={() => toggleCategory(cat.id)}
              >
                {cat.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>{cat.name}</span>
              </button>

              {cat.isOpen && (
                <div className="grid grid-cols-4 gap-2">
                  {cat.items.map(item => (
                    <button
                      key={item.label}
                      onClick={() => handleSelect(item.mode)}
                      className={`flex flex-col items-center justify-center aspect-square bg-surface-dim border p-2 transition-all text-center rounded-none focus:outline-none active:scale-95 ${
                        tool === item.mode
                          ? 'border-primary bg-surface-bright text-primary font-bold shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'border-border-hairline text-text-secondary hover:border-text-secondary/50 hover:bg-surface-bright/50 hover:text-text-primary'
                      }`}
                    >
                      <div className="mb-1.5">
                        {item.icon}
                      </div>
                      <span className="text-[9px] font-mono tracking-wider uppercase font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted gap-2">
              <Box size={24} />
              <span className="text-xs uppercase tracking-wider font-mono">No components</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};