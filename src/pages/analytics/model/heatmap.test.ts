import { describe, expect, it } from 'vitest';
import { buildHeatmap, heatIntensity } from './heatmap';

describe('buildHeatmap', () => {
  it('places months into year rows and compounds the yearly total', () => {
    const rows = buildHeatmap([
      { month: '2025-11', return: 0.1, pnl: 0 },
      { month: '2025-12', return: -0.1, pnl: 0 },
      { month: '2026-01', return: 0.02, pnl: 0 },
    ]);
    expect(rows.map((r) => r.year)).toEqual(['2025', '2026']);
    expect(rows[0]?.months.slice(9)).toEqual([null, 0.1, -0.1]);
    expect(rows[0]?.total).toBeCloseTo(1.1 * 0.9 - 1, 12);
    expect(rows[1]?.months[0]).toBe(0.02);
    expect(rows[1]?.months.filter((m) => m !== null)).toHaveLength(1);
  });

  it('is empty without data', () => {
    expect(buildHeatmap([])).toEqual([]);
  });
});

describe('heatIntensity', () => {
  it('scales by magnitude and caps at one', () => {
    expect(heatIntensity(0.04)).toBe(0.5);
    expect(heatIntensity(-0.04)).toBe(0.5);
    expect(heatIntensity(0.2)).toBe(1);
  });
});
