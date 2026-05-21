import { useUIStore } from '../stores/uiStore';
import { PropertiesPanel } from './PropertiesPanel';
import { X } from 'lucide-react';

export const MobilePropertiesPanel: React.FC = () => {
  const mobilePropertiesOpen = useUIStore((s) => s.mobilePropertiesOpen);
  const setMobilePropertiesOpen = useUIStore((s) => s.setMobilePropertiesOpen);
  const selectedId = useUIStore((s) => s.selectedId);

  if (!mobilePropertiesOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={() => setMobilePropertiesOpen(false)}
      />

      {/* Slide-in Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-[88vw] max-w-[360px] bg-surface border-l border-border-hairline shadow-[-8px_0_32px_rgba(0,0,0,0.4)] flex flex-col animate-slide-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-surface-dim border-b border-border-hairline">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">Properties</span>
          </div>
          <button
            onClick={() => setMobilePropertiesOpen(false)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <PropertiesPanel showHeader={false} />
        </div>

        {/* Footer hint when nothing selected */}
        {!selectedId && (
          <div className="p-4 text-center text-text-muted text-xs">
            <span>Select a component on the canvas to view its properties</span>
          </div>
        )}
      </div>
    </>
  );
};