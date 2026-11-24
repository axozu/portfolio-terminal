import { useEffect } from 'react';

export interface HotkeyActions {
  newTransaction: () => void;
  focusSearch: () => void;
  showHelp: () => void;
}

/** Клавиши не перехватываются, пока пользователь печатает или открыт диалог. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type);
  }
  return false;
}

function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

/** Действие для нажатия или `null`, если клавиша не наша. */
export function hotkeyFor(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  switch (event.key) {
    case 'n':
    case 'N':
    case 'т': // та же клавиша в русской раскладке
    case 'Т':
      return 'newTransaction';
    case '/':
      return 'focusSearch';
    case '?':
      return 'showHelp';
    default:
      return null;
  }
}

/** Горячие клавиши терминала: N — новая сделка, / — поиск в таблице, ? — справка. */
export function useGlobalHotkeys(actions: HotkeyActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target) || isDialogOpen()) return;
      const action = hotkeyFor(event);
      if (!action) return;
      event.preventDefault();
      actions[action]();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [actions]);
}

/** Фокус в поиск текущей таблицы (поле с атрибутом `data-table-search`). */
export function focusTableSearch(): void {
  const input = document.querySelector<HTMLInputElement>('[data-table-search]');
  input?.focus();
  input?.select();
}
