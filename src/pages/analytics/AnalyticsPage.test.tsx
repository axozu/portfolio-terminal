import { screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  await Promise.all([
    import('@/pages/analytics'),
    import('@/shared/ui/charts/MonthlyBarChart'),
    import('@/shared/ui/charts/TimeSeriesChart'),
  ]);
});

describe('AnalyticsPage', () => {
  it('shows risk metrics with formula hints', async () => {
    setupTestApi();
    renderApp('/analytics');
    expect(await screen.findByText('Volatility')).toBeInTheDocument();
    expect(screen.getByText('Sharpe ratio')).toBeInTheDocument();
    expect(screen.getByLabelText(/× √252/)).toBeInTheDocument();
    expect(screen.getByLabelText(/4% risk-free rate/)).toBeInTheDocument();
    // Максимальная просадка демо-портфеля около −24%.
    expect(screen.getByText(/^−2\d\.\d%$/)).toBeInTheDocument();
  });

  it('renders the monthly heatmap as a table with yearly totals', async () => {
    setupTestApi();
    renderApp('/analytics');
    const table = await screen.findByRole('table', { name: /Monthly returns by year/ });
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(4); // заголовок + 3–4 года
    expect(within(table).getByRole('columnheader', { name: 'Jan' })).toBeInTheDocument();
    expect(within(table).getAllByText(/^[+−]\d+\.\d%$/).length).toBeGreaterThan(30);
  });

  it('shows drawdown, sectors and dividends', async () => {
    setupTestApi();
    renderApp('/analytics');
    expect(await screen.findByLabelText('Drawdown chart')).toBeInTheDocument();
    expect(screen.getByText(/The deepest drawdown was/)).toBeInTheDocument();
    const sectors = screen.getByRole('list', { name: 'Allocation by sector' });
    expect(within(sectors).getByText('Technology')).toBeInTheDocument();
    expect(within(sectors).getByText('Crypto')).toBeInTheDocument();
    expect(await screen.findByText(/^Dividends from/)).toBeInTheDocument();
  });
});
