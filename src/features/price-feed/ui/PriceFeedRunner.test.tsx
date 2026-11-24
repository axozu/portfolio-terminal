import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from '@/shared/api';
import { useLivePricesStore } from '@/shared/store/livePrices';
import { Flash } from '@/shared/ui/Flash';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';
import type { PriceFeedOptions } from '../model/priceFeed';
import { LiveIndicator } from './LiveIndicator';
import { PriceFeedRunner } from './PriceFeedRunner';

/** Планировщик, который копит колбэки и запускает их по команде теста. */
function manualScheduler() {
  const queue: (() => void)[] = [];
  const options: PriceFeedOptions = {
    schedule: (callback) => {
      queue.push(callback);
      return setTimeout(() => undefined, 0);
    },
    cancel: () => {
      queue.length = 0;
    },
  };
  return { options, pending: () => queue.length, runNext: () => queue.shift()?.() };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

describe('PriceFeedRunner', () => {
  it('seeds prices from the API and applies ticks to the store', async () => {
    setupTestApi();
    useLivePricesStore.setState({ paused: false });
    const scheduler = manualScheduler();
    render(<PriceFeedRunner options={scheduler.options} />, { wrapper });

    await waitFor(() => {
      expect(useLivePricesStore.getState().prices.AAPL).toBe(228);
    });
    const before = { ...useLivePricesStore.getState().prices };
    act(() => {
      scheduler.runNext();
    });
    const after = useLivePricesStore.getState().prices;
    expect(Object.keys(after).some((t) => after[t] !== before[t])).toBe(true);
  });

  it('stops while paused or while the tab is hidden', async () => {
    setupTestApi();
    useLivePricesStore.setState({ paused: false });
    const scheduler = manualScheduler();
    render(<PriceFeedRunner options={scheduler.options} />, { wrapper });
    await waitFor(() => {
      expect(scheduler.pending()).toBe(1);
    });

    act(() => {
      useLivePricesStore.getState().togglePaused();
    });
    expect(scheduler.pending()).toBe(0);

    act(() => {
      useLivePricesStore.getState().togglePaused();
    });
    expect(scheduler.pending()).toBe(1);

    act(() => {
      useLivePricesStore.getState().setHidden(true);
    });
    expect(scheduler.pending()).toBe(0);
  });

  it('pauses from the LIVE button', async () => {
    useLivePricesStore.setState({ paused: false });
    const user = userEvent.setup();
    render(<LiveIndicator />, { wrapper });
    await user.click(screen.getByRole('button', { name: 'Pause live prices' }));
    expect(useLivePricesStore.getState().paused).toBe(true);
    expect(screen.getByRole('button', { name: 'Resume live prices' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('live recalculation', () => {
  it('recomputes the header value from a price tick and flashes it', async () => {
    setupTestApi();
    renderApp('/');
    const [header] = await screen.findAllByRole('banner');
    if (!header) throw new Error('header not found');
    const valueText = async () =>
      (await screen.findAllByText(/^\$\d{3},\d{3}\.\d{2}$/, { selector: 'header *' }))[0]
        ?.textContent;
    const before = await valueText();

    // BTC в портфеле ≈ 0.18: рост цены на $10 000 добавляет ≈ $1 800 к стоимости.
    act(() => {
      useLivePricesStore.getState().applyTicks([{ ticker: 'BTC', price: 106_000 }]);
    });
    await waitFor(async () => {
      expect(await valueText()).not.toBe(before);
    });
    expect(header.querySelector('[data-flash="up"]')).not.toBeNull();
  });
});

describe('Flash', () => {
  it('marks the direction of a change and nothing on first render', () => {
    const { rerender, container } = render(<Flash value={10}>10</Flash>);
    expect(container.querySelector('[data-flash]')).toBeNull();
    rerender(<Flash value={9}>9</Flash>);
    expect(container.querySelector('[data-flash="down"]')).not.toBeNull();
    rerender(<Flash value={11}>11</Flash>);
    expect(container.querySelector('[data-flash="up"]')).not.toBeNull();
  });
});
