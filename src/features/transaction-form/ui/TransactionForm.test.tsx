import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { changeLocale } from '@/shared/i18n';
import { useUiStore } from '@/shared/store/ui';
import { setupTestApi, TEST_TODAY } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

// Прогрев ленивых чанков (форма, страница обзора, графики): холодная загрузка в параллельном прогоне медленная.
beforeAll(async () => {
  await Promise.all([
    import('@/features/transaction-form/ui/TransactionForm'),
    import('@/pages/overview'),
    import('@/shared/ui/charts/DonutChart'),
    import('@/shared/ui/charts/TimeSeriesChart'),
  ]);
});

afterEach(async () => {
  useUiStore.getState().closeTransactionForm();
  await changeLocale('en');
});

async function openForm(
  prefill: Parameters<ReturnType<typeof useUiStore.getState>['openCreateForm']>[0] = {},
) {
  const user = userEvent.setup();
  const db = setupTestApi();
  renderApp('/');
  await screen.findAllByText('Total return');
  useUiStore.getState().openCreateForm(prefill);
  const dialog = await screen.findByRole('dialog', { name: 'New transaction' });
  // Форма — ленивый чанк: ждём, пока она отрисуется в панели.
  await within(dialog).findByRole('button', { name: 'Add transaction' });
  return { user, db, dialog };
}

describe('TransactionForm', () => {
  it('shows fields that depend on the transaction type', async () => {
    const { user, dialog } = await openForm();
    const form = within(dialog);
    expect(form.getByRole('combobox', { name: 'Asset' })).toBeInTheDocument();
    expect(form.getByLabelText('Quantity')).toBeInTheDocument();
    expect(form.getByLabelText('Price per unit')).toBeInTheDocument();
    expect(form.queryByLabelText('Amount')).not.toBeInTheDocument();

    await user.click(form.getByRole('radio', { name: 'Deposit' }));
    expect(form.queryByRole('combobox', { name: 'Asset' })).not.toBeInTheDocument();
    expect(form.queryByLabelText('Quantity')).not.toBeInTheDocument();
    expect(form.getByLabelText('Amount')).toBeInTheDocument();

    await user.click(form.getByRole('radio', { name: 'Dividend' }));
    expect(form.getByRole('combobox', { name: 'Asset' })).toBeInTheDocument();
    expect(form.getByLabelText('Amount')).toBeInTheDocument();
  });

  it('shows validation errors at the fields', async () => {
    const { user, dialog } = await openForm({ type: 'buy', ticker: 'AAPL' });
    const form = within(dialog);
    await user.type(form.getByLabelText('Quantity'), '-1');
    await user.click(form.getByRole('button', { name: 'Add transaction' }));
    expect(await form.findByText('Must be greater than zero')).toBeInTheDocument();
    expect(form.getByLabelText('Quantity')).toHaveAttribute('aria-invalid', 'true');
  });

  it('checks precision and future dates on the client', async () => {
    const { user, dialog } = await openForm({ type: 'buy', ticker: 'AAPL' });
    const form = within(dialog);
    await user.type(form.getByLabelText('Quantity'), '1.123456');
    await user.clear(form.getByLabelText('Date'));
    await user.type(form.getByLabelText('Date'), '2099-01-01');
    await user.click(form.getByRole('button', { name: 'Add transaction' }));
    expect(await form.findByText('At most 4 decimal places')).toBeInTheDocument();
    expect(form.getByText('Date cannot be in the future')).toBeInTheDocument();
  });

  it('fills the price from the close and previews the result', async () => {
    const { user, dialog } = await openForm({ type: 'buy', ticker: 'AAPL' });
    const form = within(dialog);
    await waitFor(() => {
      expect(form.getByLabelText('Price per unit')).toHaveValue('228');
    });
    await user.type(form.getByLabelText('Quantity'), '2');
    const preview = form.getByText('After this transaction').closest('section');
    if (!preview) throw new Error('preview not found');
    // 2 × 228 + комиссия 0
    expect(within(preview).getByText('−$456.00')).toBeInTheDocument();
  });

  it('shows the server ledger error at the field', async () => {
    const { user, dialog } = await openForm({ type: 'buy', ticker: 'BTC' });
    const form = within(dialog);
    await user.type(form.getByLabelText('Quantity'), '100');
    await user.click(form.getByRole('button', { name: 'Add transaction' }));
    expect(
      await form.findByText(/Not enough cash on this date: \$[\d,.]+ available/),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New transaction' })).toBeInTheDocument();
  });

  it('translates errors already shown when the language changes', async () => {
    const { user, dialog } = await openForm({ type: 'deposit' });
    const form = within(dialog);
    await user.click(form.getByRole('button', { name: 'Add transaction' }));
    expect(await form.findByText('Required')).toBeInTheDocument();
    await changeLocale('ru');
    expect(await form.findByText('Обязательное поле')).toBeInTheDocument();
  });

  it('saves a deposit, closes and updates the portfolio', async () => {
    const { user, dialog, db } = await openForm({ type: 'deposit' });
    const form = within(dialog);
    await user.type(form.getByLabelText('Amount'), '1 000,50');
    await user.type(form.getByLabelText('Note'), 'Bonus');
    await user.click(form.getByRole('button', { name: 'Add transaction' }));

    expect(await screen.findByText('Transaction added')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'New transaction' })).not.toBeInTheDocument();
    });
    expect(db.transactions.at(-1)).toMatchObject({
      type: 'deposit',
      amount: 1000.5,
      date: TEST_TODAY,
      note: 'Bonus',
    });
  });
});
