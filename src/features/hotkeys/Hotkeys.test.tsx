import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { isChaosEnabled } from '@/mocks/chaosFlag';
import { useUiStore } from '@/shared/store/ui';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';
import { hotkeyFor, isTypingTarget } from './model/useGlobalHotkeys';

afterEach(() => {
  useUiStore.getState().closeTransactionForm();
});

describe('hotkeyFor', () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
    hotkeyFor({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods });

  it('maps keys in both keyboard layouts and ignores modifiers', () => {
    expect(key('n')).toBe('newTransaction');
    expect(key('т')).toBe('newTransaction');
    expect(key('/')).toBe('focusSearch');
    expect(key('?')).toBe('showHelp');
    expect(key('n', { ctrlKey: true })).toBeNull();
    expect(key('x')).toBeNull();
  });

  it('does not fire while typing', () => {
    const input = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(checkbox)).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
  });
});

describe('global hotkeys', () => {
  it('N opens the new transaction form', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    await screen.findAllByText('Total return');
    await user.keyboard('n');
    expect(useUiStore.getState().transactionForm.open).toBe(true);
  });

  it('/ focuses the search of the current table', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/positions');
    const search = await screen.findByRole('searchbox', { name: 'Search positions' });
    await user.keyboard('/');
    expect(search).toHaveFocus();
    // Дальнейший ввод идёт в поле, а не в горячие клавиши.
    await user.keyboard('n');
    expect(search).toHaveValue('n');
    expect(useUiStore.getState().transactionForm.open).toBe(false);
  });

  it('? shows the list of shortcuts', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    await screen.findAllByText('Total return');
    await user.keyboard('?');
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});

describe('ChaosToggle', () => {
  it('turns API error simulation on and off', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    const toggle = await screen.findByRole('switch', { name: 'Simulate API errors' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(isChaosEnabled()).toBe(true);
    await user.click(toggle);
    await waitFor(() => {
      expect(isChaosEnabled()).toBe(false);
    });
  });
});
