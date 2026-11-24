import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('routes', () => {
  it.each([
    ['/', 'overview'],
    ['/positions', 'positions'],
    ['/assets/AAPL', 'asset'],
    ['/transactions', 'transactions'],
    ['/analytics', 'analytics'],
    ['/no-such-page', 'not-found'],
  ])('renders %s as the %s page', async (path, pageId) => {
    renderAt(path);
    expect(await screen.findByTestId(`page-${pageId}`)).toBeInTheDocument();
  });
});
