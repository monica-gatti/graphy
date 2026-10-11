/**
 * Leaflet draws SVG paths with plain colour attributes, which can't use CSS var(),
 * so this reads the OUDS design tokens at runtime instead of hard-coding hex values.
 */
export function cssToken(name: string, fallback = '#000'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export const TOKENS = {
  working: '--bs-color-content-status-positive', // #138126
  broken: '--bs-color-content-status-negative', // #db0002
  impacted: '--bs-color-border-status-warning', // #ffd000
  outline: '--bs-color-bg-primary', // #fff
};

/** Alternative routes: Orange brand orange, OUDS info blue, OUDS default (black). */
export const ROUTE_TOKENS = [
  '--bs-color-surface-brand-primary',
  '--bs-color-content-status-info',
  '--bs-color-content-default',
];
