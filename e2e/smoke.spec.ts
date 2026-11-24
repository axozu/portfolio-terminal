import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Число из денежной строки вида «$12,345.67» / «−$5.00». */
function money(text: string): number {
  const sign = text.includes('−') || text.includes('-') ? -1 : 1;
  return sign * Number(text.replace(/[^\d.]/g, ''));
}

async function cash(page: Page): Promise<number> {
  await page.goto('/');
  const cell = page.locator('dl > div').filter({ has: page.getByText('Cash', { exact: true }) });
  return money(await cell.locator('dd').first().innerText());
}

async function aaplQuantity(page: Page): Promise<number> {
  await page.goto('/positions');
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: /Apple Inc\./ }) });
  // Колонки: актив, класс, количество…
  return Number((await row.getByRole('cell').nth(2).innerText()).replace(/,/g, ''));
}

test('overview shows live data without registration', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('header').first().getByText('Demo data', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText('Total return')).toBeVisible();
  await expect(
    page
      .locator('header')
      .first()
      .getByText(/^\$\d{3},\d{3}\.\d{2}$/),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'Portfolio value chart' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Allocation by asset class' })).toBeVisible();
});

test('a purchase updates the portfolio and deleting it restores it', async ({ page }) => {
  const cashBefore = await cash(page);
  const quantityBefore = await aaplQuantity(page);

  // Покупка через форму
  await page.getByRole('button', { name: 'New transaction' }).click();
  const form = page.getByRole('dialog', { name: 'New transaction' });
  await form.getByRole('combobox', { name: 'Asset' }).click();
  await page.getByPlaceholder('Search by ticker or name').fill('AAPL');
  await page.getByRole('option', { name: /AAPL/ }).click();
  await form.getByLabel('Quantity').fill('2');
  await expect(form.getByLabel('Price per unit')).not.toHaveValue('');
  const price = Number(await form.getByLabel('Price per unit').inputValue());
  await form.getByRole('button', { name: 'Add transaction' }).click();
  await expect(page.getByText('Transaction added')).toBeVisible();

  expect(await aaplQuantity(page)).toBeCloseTo(quantityBefore + 2, 4);
  expect(await cash(page)).toBeCloseTo(cashBefore - 2 * price, 1);

  // Удаление этой сделки: она самая новая — первая строка
  await page.goto('/transactions');
  const firstRow = page.getByRole('table', { name: 'Transactions' }).getByRole('row').nth(1);
  await expect(firstRow).toContainText('AAPL');
  await firstRow.getByRole('button', { name: /^Delete transaction/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Transaction deleted')).toBeVisible();

  expect(await aaplQuantity(page)).toBeCloseTo(quantityBefore, 4);
  expect(await cash(page)).toBeCloseTo(cashBefore, 1);
});

test('switching to Russian changes texts, numbers and html lang', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Total return')).toBeVisible();
  await page.getByRole('button', { name: 'ru' }).click();
  await expect(page.getByText('Общая доходность')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Основная навигация' }).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(
    page
      .locator('header')
      .first()
      .getByText(/^\d{3}\s\d{3},\d{2}\s\$$/),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText('Общая доходность')).toBeVisible();
});

test('asset page opens from the positions table', async ({ page }) => {
  await page.goto('/positions');
  await page.getByRole('link', { name: /Bitcoin/ }).click();
  await expect(page).toHaveURL(/\/assets\/BTC$/);
  await expect(page.getByRole('heading', { name: /BTC\s*Bitcoin/ })).toBeVisible();
  await expect(page.getByRole('img', { name: 'BTC price chart' })).toBeVisible();
  await expect(page.getByText('Your position')).toBeVisible();
});

test('unknown routes and tickers show clear pages', async ({ page }) => {
  await page.goto('/assets/NOPE');
  await expect(page.getByRole('heading', { name: 'Asset not found' })).toBeVisible();
  await page.goto('/nowhere');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('pages have no WCAG 2.1 AA violations', async ({ page }) => {
  for (const path of ['/', '/positions', '/transactions', '/analytics', '/assets/AAPL']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => `${path}: ${v.id}`)).toEqual([]);
  }
});
