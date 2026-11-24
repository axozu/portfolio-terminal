export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

/** Выборочное стандартное отклонение (с поправкой Бесселя, n − 1). */
export function sampleStdDev(values: readonly number[]): number | null {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  let squares = 0;
  for (const value of values) squares += (value - avg) ** 2;
  return Math.sqrt(squares / (values.length - 1));
}

export function nearlyEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Округление вниз до `precision` знаков (для количества при покупке на сумму). */
export function floorToPrecision(value: number, precision: number): number {
  const factor = 10 ** precision;
  // Небольшой сдвиг гасит ошибки представления вроде 0.29 * 100 = 28.999999999999996.
  return Math.floor(value * factor + 1e-7) / factor;
}

/** Проверяет, что у числа не больше `precision` знаков после запятой. */
export function hasPrecision(value: number, precision: number): boolean {
  const factor = 10 ** precision;
  const scaled = value * factor;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
