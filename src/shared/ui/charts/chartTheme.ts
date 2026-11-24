/**
 * Цвета графиков берутся из CSS-токенов (`--chart-*` в index.css), а не задаются в компонентах:
 * библиотекам графиков нужны конкретные значения, поэтому читаем их в рантайме.
 */
export const CHART_SLOTS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;
export type ChartSlot = (typeof CHART_SLOTS)[number];

const FALLBACKS: Record<string, string> = {
  '--chart-1': '#c98500',
  '--chart-2': '#3987e5',
  '--chart-3': '#d55181',
  '--chart-4': '#9085e9',
  '--chart-5': '#1d9aaa',
  '--chart-grid': '#1f262f',
  '--chart-axis': '#8a94a3',
  '--border': '#262e39',
  '--foreground': '#e6eaf0',
  '--gain': '#3fcf8e',
  '--loss': '#f2545b',
  '--card': '#151a21',
};

export function cssVar(name: string): string {
  if (typeof document === 'undefined') return FALLBACKS[name] ?? '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || (FALLBACKS[name] ?? '');
}

export interface ChartTheme {
  grid: string;
  axis: string;
  border: string;
  text: string;
  surface: string;
  gain: string;
  loss: string;
  fontFamily: string;
}

export function readChartTheme(): ChartTheme {
  return {
    grid: cssVar('--chart-grid'),
    axis: cssVar('--chart-axis'),
    border: cssVar('--border'),
    text: cssVar('--foreground'),
    surface: cssVar('--card'),
    gain: cssVar('--gain'),
    loss: cssVar('--loss'),
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  };
}

/** Цвет с прозрачностью для заливок под линией. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const channel = (i: number) => parseInt(value.slice(i, i + 2), 16);
  return `rgba(${String(channel(0))}, ${String(channel(2))}, ${String(channel(4))}, ${String(alpha)})`;
}
