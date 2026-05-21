import React, { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  icon: string;
  targetId: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Introduction', icon: 'description', targetId: 'intro' },
  { label: 'Simulation Loop', icon: 'sync', targetId: 'sim-loop' },
  { label: 'Matrix Math', icon: 'functions', targetId: 'matrix-math' },
  { label: 'Component Reference', icon: 'category', targetId: 'comp-ref' }
];

export const SideNavBar: React.FC = () => {
  const [activeItem, setActiveItem] = useState('intro');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const intersecting = entries.filter(e => e.isIntersecting);
      if (intersecting.length > 0) {
        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveItem(intersecting[0].target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    NAV_ITEMS.forEach((item) => {
      const element = document.getElementById(item.targetId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleNavClick = (targetId: string) => {
    setActiveItem(targetId);
    setMobileNavOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-3 md:p-4 border-b border-border-hairline bg-surface">
      {/* Desktop Header */}
      <div className="hidden md:block text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold mb-4 font-mono">Table of Contents</div>
      
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="md:hidden w-full flex items-center justify-between px-3 py-2 bg-surface-dim border border-border-hairline text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="font-bold uppercase tracking-wider">Contents</span>
        <span className="text-[10px]">{mobileNavOpen ? '▲' : '▼'}</span>
      </button>

      {/* Desktop Nav - Always visible on desktop */}
      <nav className="hidden md:block space-y-1">
        {NAV_ITEMS.map((item) => (
          <button 
            key={item.targetId}
            onClick={() => handleNavClick(item.targetId)}
            aria-current={activeItem === item.targetId ? 'location' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none rounded-none focus:outline-none ${
              activeItem === item.targetId 
                ? 'bg-surface-bright text-primary border-l-2 border-primary font-bold' 
                : 'text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary border-l-2 border-transparent'
            }`}
          >
            <i className="material-icons text-sm">{item.icon}</i>
            <span className="font-sans">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Nav - Collapsible */}
      {mobileNavOpen && (
        <nav className="md:hidden mt-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button 
              key={item.targetId}
              onClick={() => handleNavClick(item.targetId)}
              aria-current={activeItem === item.targetId ? 'location' : undefined}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer select-none rounded-none focus:outline-none ${
                activeItem === item.targetId 
                  ? 'bg-surface-bright text-primary border-l-2 border-primary font-bold' 
                  : 'text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary border-l-2 border-transparent'
              }`}
            >
              <i className="material-icons text-sm">{item.icon}</i>
              <span className="font-sans">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default SideNavBar;
