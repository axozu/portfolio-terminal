import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { changeLocale, LOCALE_STORAGE_KEY } from '@/shared/i18n';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

afterEach(async () => {
  await changeLocale('en');
});

describe('AppLayout', () => {
  it('shows navigation, the demo badge and the portfolio value', async () => {
    setupTestApi();
    renderApp('/');
    const nav = (await screen.findAllByRole('navigation', { name: 'Main navigation' }))[0];
    expect(nav && within(nav).getByRole('link', { name: 'Positions' })).toBeInTheDocument();
    expect(screen.getByText('Demo data')).toBeInTheDocument();
    // Стоимость портфеля: $ и число с разделителями.
    expect((await screen.findAllByText(/^\$\d{3},\d{3}\.\d{2}$/)).length).toBeGreaterThan(0);
  });

  it('fills the ticker tape with asset prices', async () => {
    setupTestApi();
    renderApp('/');
    const tape = await screen.findByRole('region', { name: 'Market prices' });
    expect((await within(tape).findAllByText('AAPL')).length).toBeGreaterThan(0);
  });

  it('switches language instantly: texts, number formats and html lang', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    await screen.findAllByText(/^\$\d{3},\d{3}\.\d{2}$/);

    await user.click(screen.getByRole('button', { name: 'ru' }));

    expect(screen.getAllByRole('link', { name: 'Позиции' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Демо-данные')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/^\d{3}[\s  ]\d{3},\d{2}[\s  ]\$$/).length).toBeGreaterThan(0);
    });
    expect(document.documentElement.lang).toBe('ru');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ru');
    expect(screen.getByRole('button', { name: 'ru' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the layout when a page request fails and offers a retry', async () => {
    setupTestApi({ chaos: true, random: () => 0 });
    renderApp('/');
    expect(
      (await screen.findAllByRole('navigation', { name: 'Main navigation' }))[0],
    ).toBeInTheDocument();
    // Шапка не падает: вместо стоимости — прочерк после неудачных повторов.
    expect(await screen.findByText('—', {}, { timeout: 10_000 })).toBeInTheDocument();
  });
});
