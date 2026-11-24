import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/shared/store/ui';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

afterEach(() => {
  useUiStore.getState().closeTransactionForm();
});

describe('AssetPage', () => {
  it('shows the asset, its chart, position and transactions', async () => {
    setupTestApi();
    renderApp('/assets/aapl');
    expect(await screen.findByRole('heading', { name: /AAPL\s*Apple Inc\./ })).toBeInTheDocument();
    const chart = await screen.findByLabelText('AAPL price chart');
    expect(chart).toHaveAttribute('data-mode', 'candles');

    const position = (await screen.findByText('Your position')).closest('section');
    if (!position) throw new Error('panel not found');
    expect(await within(position).findByText('Average price')).toBeInTheDocument();

    const txPanel = (await screen.findByText('Transactions in AAPL')).closest('section');
    if (!txPanel) throw new Error('panel not found');
    expect((await within(txPanel).findAllByRole('listitem')).length).toBeGreaterThan(0);
  });

  it('switches the chart to a line', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/assets/BTC');
    await screen.findByLabelText('BTC price chart');
    await user.click(screen.getByRole('button', { name: 'Line' }));
    expect(screen.getByLabelText('BTC price chart')).toHaveAttribute('data-mode', 'line');
  });

  it('opens the transaction form with the ticker prefilled', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/assets/ETH');
    await user.click(await screen.findByRole('button', { name: 'Sell' }));
    expect(useUiStore.getState().transactionForm).toEqual({
      open: true,
      mode: 'create',
      prefill: { type: 'sell', ticker: 'ETH' },
    });
  });

  it('shows a clear page for an unknown ticker', async () => {
    setupTestApi();
    renderApp('/assets/NOPE');
    expect(await screen.findByRole('heading', { name: 'Asset not found' })).toBeInTheDocument();
    expect(screen.getByText(/no asset with ticker NOPE/)).toBeInTheDocument();
  });
});
