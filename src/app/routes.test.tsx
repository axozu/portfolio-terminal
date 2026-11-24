import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

describe('routes', () => {
  it.each([
    ['/', 'overview'],
    ['/positions', 'positions'],
    ['/assets/AAPL', 'asset'],
    ['/transactions', 'transactions'],
    ['/analytics', 'analytics'],
    ['/no-such-page', 'not-found'],
  ])('renders %s as the %s page', async (path, pageId) => {
    setupTestApi();
    renderApp(path);
    expect(await screen.findByTestId(`page-${pageId}`)).toBeInTheDocument();
  });

  it('shows the missing path on the 404 page', async () => {
    setupTestApi();
    renderApp('/nowhere');
    expect(await screen.findByText(/\/nowhere/, { selector: 'p' })).toBeInTheDocument();
  });
});
