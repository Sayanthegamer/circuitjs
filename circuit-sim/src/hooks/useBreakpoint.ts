import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;
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

function getOrientation(width: number, height: number): Orientation {
  return height >= width ? 'portrait' : 'landscape';
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = getOrientation(width, height);
    return {
      breakpoint: getBreakpoint(width),
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isDesktop: width >= BREAKPOINTS.tablet,
      orientation,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      width,
    };
  });

  useEffect(() => {
    const mediaQueries = {
      mobile: window.matchMedia('(max-width: 639px)'),
      tablet: window.matchMedia('(min-width: 640px) and (max-width: 1023px)'),
      desktop: window.matchMedia('(min-width: 1024px)'),
    };

    const handler = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = getOrientation(width, height);
      setState({
        breakpoint: getBreakpoint(width),
        isMobile: mediaQueries.mobile.matches,
        isTablet: mediaQueries.tablet.matches,
        isDesktop: mediaQueries.desktop.matches,
        orientation,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape',
        width,
      });
    };

    // Orientation change listener
    window.addEventListener('resize', handler);
    mediaQueries.mobile.addEventListener('change', handler);
    mediaQueries.tablet.addEventListener('change', handler);
    mediaQueries.desktop.addEventListener('change', handler);

    return () => {
      window.removeEventListener('resize', handler);
      mediaQueries.mobile.removeEventListener('change', handler);
      mediaQueries.tablet.removeEventListener('change', handler);
      mediaQueries.desktop.removeEventListener('change', handler);
    };
  }, []);

  return state;
}