/**
 * Скриншоты для README и картинка Open Graph.
 * Запуск: `npm run build && npm run screenshots` (поднимает preview-сервер сам).
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const PORT = 4180;
const BASE = `http://localhost:${PORT}`;
const OUT = 'docs/screenshots';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // ещё не поднялся
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Preview server did not start');
}

async function shoot(browser, { path, file, viewport, before }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (before) await before(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: file });
  await page.close();
}

try {
  await waitForServer();
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const desktop = { width: 1440, height: 900 };

  await shoot(browser, { path: '/', file: `${OUT}/overview.png`, viewport: desktop });
  await shoot(browser, { path: '/positions', file: `${OUT}/positions.png`, viewport: desktop });
  await shoot(browser, { path: '/assets/BTC', file: `${OUT}/asset.png`, viewport: desktop });
  await shoot(browser, { path: '/analytics', file: `${OUT}/analytics.png`, viewport: desktop });
  await shoot(browser, {
    path: '/assets/AAPL',
    file: `${OUT}/transaction-form.png`,
    viewport: desktop,
    before: async (page) => {
      await page.getByRole('button', { name: 'Buy' }).first().click();
      await page.getByLabel('Quantity').fill('5');
    },
  });
  await shoot(browser, {
    path: '/',
    file: `${OUT}/mobile.png`,
    viewport: { width: 390, height: 844 },
  });

  // Open Graph: 1200×630, без увеличения плотности
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(BASE, { waitUntil: 'networkidle' });
  await og.waitForTimeout(1200);
  await og.screenshot({ path: 'public/og-image.png' });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}/ and public/og-image.png`);
} finally {
  server.kill();
}
