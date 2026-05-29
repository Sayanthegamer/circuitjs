import React, { useState, useEffect } from 'react';
import { Sparkles, X, Smartphone } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const getIsStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         ('standalone' in window.navigator && (window.navigator as NavigatorWithStandalone).standalone === true);
};

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Initialize isVisible lazily so we can check standalone state synchronously
  const [isVisible, setIsVisible] = useState(() => {
    // We only want to show it if we have a deferred prompt and it hasn't been dismissed,
    // but initially it should be false until the event fires.
    if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          ('standalone' in window.navigator && (window.navigator as NavigatorWithStandalone).standalone === true);
        if (isStandalone) {
            return false;
        }
    }
    return false;
  });

  const { isDesktop } = useBreakpoint();
  const mobileDockHeight = useUIStore((s) => s.mobileDockHeight);

  useEffect(() => {
    // Check if the application is already running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          ('standalone' in window.navigator && (window.navigator as NavigatorWithStandalone).standalone === true);

    if (isStandalone) {
      return;
    }

    const handler = (e: Event) => {
      // Prevent the browser's default bar
      e.preventDefault();
      // Store the event so we can trigger it later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show the banner if the user hasn't dismissed it in this session
      const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      const isStandalone = getIsStandalone();
      if (!dismissed && !isStandalone) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger the install dialog
    await deferredPrompt.prompt();
    
    // Read the user's choice
    await deferredPrompt.userChoice;
    
    // Clear deferred prompt and hide panel
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  let bottomStyle = '16px';
  if (!isDesktop) {
    const heightMap = {
      collapsed: 42,
      medium: 250,
      expanded: 400
    };
    const dockHeight = heightMap[mobileDockHeight || 'expanded'] || 400;
    bottomStyle = `${dockHeight + 16}px`;
  }

  return (
    <div 
      className="fixed left-4 right-4 z-50 animate-slide-up flex justify-center pointer-events-none"
      style={{ bottom: bottomStyle }}
    >
      <div className="w-full max-w-[480px] bg-surface/85 backdrop-blur-md border border-primary/20 p-3 shadow-2xl flex items-center justify-between gap-3 text-text-primary pointer-events-auto rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Smartphone size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider font-sans">Install App</span>
              <span className="flex items-center gap-0.5 bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-1 font-mono">
                <Sparkles size={8} /> Fast UI
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-normal mt-0.5 font-sans">
              Add to Home Screen for native fullscreen editing.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all focus:outline-none active:scale-95 cursor-pointer rounded-none"
          >
            Add to Home
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
