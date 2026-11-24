import type { Time } from 'lightweight-charts';
import type { IsoDate } from '@/shared/model';

/** Время Lightweight Charts (строка, BusinessDay или UTC-секунды) → `YYYY-MM-DD`. */
export function timeToIsoDate(time: Time): IsoDate {
  if (typeof time === 'string') return time;
  if (typeof time === 'number') return new Date(time * 1000).toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(time.year)}-${pad(time.month)}-${pad(time.day)}`;
}
