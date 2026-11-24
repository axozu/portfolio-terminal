/**
 * Флаг режима хаоса. Отдельный модуль без зависимостей от MSW, чтобы переключатель
 * в интерфейсе не тянул фейковый API в основной бандл.
 */
export const CHAOS_STORAGE_KEY = 'portfolio-terminal:chaos';

export function isChaosEnabled(): boolean {
  try {
    return localStorage.getItem(CHAOS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Режим хаоса выключен по умолчанию; включается `?chaos=1` или переключателем в интерфейсе. */
export function setChaosEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(CHAOS_STORAGE_KEY, '1');
    else localStorage.removeItem(CHAOS_STORAGE_KEY);
  } catch {
    // Без localStorage режим просто не переживёт перезагрузку.
  }
}

/** `?chaos=1` / `?chaos=0` в адресе при загрузке включает или выключает режим (и запоминает выбор). */
export function syncChaosFromUrl(search: string): void {
  const flag = new URLSearchParams(search).get('chaos');
  if (flag === '1' || flag === '0') setChaosEnabled(flag === '1');
}
