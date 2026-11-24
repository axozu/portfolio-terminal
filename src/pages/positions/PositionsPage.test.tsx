import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

/** Тикеры строк таблицы по порядку. */
function tickersInTable(): string[] {
  const table = screen.getByRole('table', { name: 'Positions' });
  const body = within(table).getAllByRole('rowgroup')[1];
  if (!body) throw new Error('no tbody');
  return within(body)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]?.querySelector('.num')?.textContent ?? '');
}

async function openPositions() {
  setupTestApi();
  const user = userEvent.setup();
  const { router } = renderApp('/positions');
  await screen.findByRole('table', { name: 'Positions' });
  return { user, router };
}

describe('PositionsPage', () => {
  it('lists positions by market value with a totals row', async () => {
    await openPositions();
    const tickers = tickersInTable();
    expect(tickers.length).toBe(20);
    const table = screen.getByRole('table', { name: 'Positions' });
    expect(within(table).getByText(/^Total · 20 positions$/)).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /Market value/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('sorts by any column and toggles direction', async () => {
    const { user } = await openPositions();
    await user.click(screen.getByRole('button', { name: 'Asset' }));
    const asc = tickersInTable();
    expect(asc).toEqual([...asc].sort());
    await user.click(screen.getByRole('button', { name: 'Asset' }));
    expect(tickersInTable()).toEqual([...asc].reverse());
    expect(screen.getByRole('columnheader', { name: /Asset/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('searches and filters by class and sector', async () => {
    const { user } = await openPositions();
    await user.type(screen.getByRole('searchbox', { name: 'Search positions' }), 'vanguard');
    expect(tickersInTable().sort()).toEqual(['BND', 'VNQ', 'VOO']);

    await user.clear(screen.getByRole('searchbox', { name: 'Search positions' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Asset class' }), 'crypto');
    expect(tickersInTable().sort()).toEqual(['BTC', 'ETH', 'SOL']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Asset class' }), 'all');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sector' }), 'healthcare');
    expect(tickersInTable()).toEqual(['JNJ']);
    expect(screen.getByText(/^Total · 1 position$/)).toBeInTheDocument();
  });

  it('shows an empty state with a reset when nothing matches', async () => {
    const { user } = await openPositions();
    await user.type(screen.getByRole('searchbox', { name: 'Search positions' }), 'zzz');
    expect(screen.getByText('No positions match these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(tickersInTable()).toHaveLength(20);
  });

  it('opens the asset page on row click', async () => {
    const { user, router } = await openPositions();
    const row = screen.getByRole('link', { name: /Bitcoin/ }).closest('tr');
    if (!row) throw new Error('row not found');
    await user.click(within(row).getAllByRole('cell')[4] ?? row);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/assets/BTC');
    });
  });
});
