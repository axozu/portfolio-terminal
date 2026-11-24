import { describe, expect, it } from 'vitest';
import {
  floorToPrecision,
  hasPrecision,
  mean,
  nearlyEqual,
  roundTo,
  sampleStdDev,
  sum,
} from './math';

describe('math', () => {
  it('sums and averages', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(mean([2, 4])).toBe(3);
    expect(mean([])).toBeNull();
  });

  it('computes sample standard deviation', () => {
    // Классический пример: σ выборки [2,4,4,4,5,5,7,9] = √(32/7).
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(sampleStdDev([1])).toBeNull();
  });

  it('compares with tolerance', () => {
    expect(nearlyEqual(0.1 + 0.2, 0.3, 1e-9)).toBe(true);
    expect(nearlyEqual(1, 1.1, 1e-9)).toBe(false);
  });

  it('floors to precision without float artefacts', () => {
    expect(floorToPrecision(0.29, 2)).toBe(0.29);
    expect(floorToPrecision(1.23456789, 4)).toBe(1.2345);
    expect(floorToPrecision(0.123456789, 8)).toBe(0.12345678);
  });

  it('checks decimal precision', () => {
    expect(hasPrecision(1.2345, 4)).toBe(true);
    expect(hasPrecision(1.23456, 4)).toBe(false);
    expect(hasPrecision(0.00000001, 8)).toBe(true);
    expect(hasPrecision(10, 0)).toBe(true);
  });

  it('rounds', () => {
    expect(roundTo(-1.234, 2)).toBe(-1.23);
    expect(roundTo(123.456, 1)).toBe(123.5);
  });
});
