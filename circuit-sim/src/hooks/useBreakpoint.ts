import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => ({
    breakpoint: getBreakpoint(window.innerWidth),
    isMobile: window.innerWidth < BREAKPOINTS.mobile,
    isTablet: window.innerWidth >= BREAKPOINTS.mobile && window.innerWidth < BREAKPOINTS.tablet,
    isDesktop: window.innerWidth >= BREAKPOINTS.tablet,
    width: window.innerWidth,
  }));

  useEffect(() => {
    const mediaQueries = {
      mobile: window.matchMedia('(max-width: 639px)'),
      tablet: window.matchMedia('(min-width: 640px) and (max-width: 1023px)'),
      desktop: window.matchMedia('(min-width: 1024px)'),
    };

    const handler = () => {
      const width = window.innerWidth;
      setState({
        breakpoint: getBreakpoint(width),
        isMobile: mediaQueries.mobile.matches,
        isTablet: mediaQueries.tablet.matches,
        isDesktop: mediaQueries.desktop.matches,
        width,
      });
    };

    mediaQueries.mobile.addEventListener('change', handler);
    mediaQueries.tablet.addEventListener('change', handler);
    mediaQueries.desktop.addEventListener('change', handler);

    return () => {
      mediaQueries.mobile.removeEventListener('change', handler);
      mediaQueries.tablet.removeEventListener('change', handler);
      mediaQueries.desktop.removeEventListener('change', handler);
    };
  }, []);

  return state;
}