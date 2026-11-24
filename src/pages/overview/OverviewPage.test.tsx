import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

// Прогрев ленивых чанков графиков: холодная трансформация в параллельном прогоне медленная.
beforeAll(async () => {
  await Promise.all([
    import('@/shared/ui/charts/TimeSeriesChart'),
    import('@/shared/ui/charts/DonutChart'),
    import('@/pages/overview'),
  ]);
});

describe('OverviewPage', () => {
  it('shows KPIs computed from the portfolio', async () => {
    setupTestApi();
    renderApp('/');
    const kpis = await screen.findByText('Total return');
    const strip = kpis.closest('dl');
    if (!strip) throw new Error('KPI strip not found');
    expect(within(strip).getByText('Cash')).toBeInTheDocument();
    expect(within(strip).getByText('Unrealized P/L')).toBeInTheDocument();
    // Простая доходность сидa — около +42%.
    expect(within(strip).getByText(/^\+4\d\.\d{2}%$/)).toBeInTheDocument();
  });

  it('renders the value chart with a text summary and toggles the benchmark', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    const chart = await screen.findByLabelText('Portfolio value chart');
    expect(chart).toHaveAttribute('data-series', 'portfolio');
    expect(screen.getByText(/the value went from/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Compare with benchmark' }));
    expect(screen.getByLabelText('Portfolio value chart')).toHaveAttribute(
      'data-series',
      'portfolio,benchmark',
    );
  });

  it('switches the chart period', async () => {
    setupTestApi();
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByLabelText('Portfolio value chart');
    await user.click(screen.getByRole('button', { name: '1M' }));
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(/^From Oct 26, 2026/)).toBeInTheDocument();
  });

  it('lists allocation by class in a fixed order with weights', async () => {
    setupTestApi();
    renderApp('/');
    const table = await screen.findByRole('table', { name: 'Allocation by asset class' });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      'Stocks',
      'ETFs',
      'Bond funds',
      'Crypto',
      'Cash',
    ]);
  });

  it('shows movers and the five latest transactions', async () => {
    setupTestApi();
    renderApp('/');
    expect(await screen.findByText('Top gainers')).toBeInTheDocument();
    const recent = (await screen.findByText('Recent transactions')).closest('section');
    if (!recent) throw new Error('panel not found');
    expect(await within(recent).findAllByRole('listitem')).toHaveLength(5);
    expect(within(recent).getByRole('link', { name: 'All transactions' })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });
});
