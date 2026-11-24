import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/shared/store/ui';
import { setupTestApi } from '@/test/mockApi';
import { renderApp } from '@/test/renderApp';

afterEach(() => {
  useUiStore.getState().closeTransactionForm();
});

function bodyRows() {
  const table = screen.getByRole('table', { name: 'Transactions' });
  const body = within(table).getAllByRole('rowgroup')[1];
  if (!body) throw new Error('no tbody');
  return within(body).getAllByRole('row');
}

async function open(path = '/transactions') {
  const user = userEvent.setup();
  const db = setupTestApi();
  const { router } = renderApp(path);
  await screen.findByRole('table', { name: 'Transactions' });
  return { user, db, router };
}

describe('TransactionsPage', () => {
  it('pages through transactions on the server', async () => {
    const { user, router } = await open();
    expect(bodyRows()).toHaveLength(20);
    expect(screen.getByText(/Page 1 of \d+/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=2');
    });
    expect(await screen.findByText(/Page 2 of \d+/)).toBeInTheDocument();
  });

  it('reads filters from the URL and writes changes back', async () => {
    const { user, router } = await open('/transactions?type=dividend');
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('dividend');
    expect(bodyRows().every((row) => within(row).queryByText('Dividend'))).toBe(true);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Asset' }), 'VOO');
    await waitFor(() => {
      expect(router.state.location.search).toBe('?type=dividend&ticker=VOO');
    });
  });

  it('sorts on the server by clicking a column', async () => {
    const { user, router } = await open();
    await user.click(screen.getByRole('button', { name: 'Cash effect' }));
    await waitFor(() => {
      expect(router.state.location.search).toBe('?sort=total%3Adesc');
    });
    // Самая крупная сумма — начальное пополнение.
    await waitFor(() => {
      expect(within(bodyRows()[0] ?? document.body).getByText('Deposit')).toBeInTheDocument();
    });
  });

  it('deletes a transaction after confirmation', async () => {
    const { user, db } = await open();
    const latest = db.transactions.at(-1);
    const firstRow = bodyRows()[0];
    if (!firstRow || !latest) throw new Error('no rows');
    await user.click(within(firstRow).getByRole('button', { name: /^Delete transaction from/ }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this transaction?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Transaction deleted')).toBeInTheDocument();
    expect(db.findTransaction(latest.id)).toBeUndefined();
  });

  it('explains which transaction blocks a deletion', async () => {
    const { user, db } = await open('/transactions?sort=date%3Aasc&pageSize=10');
    const firstRow = bodyRows()[0];
    if (!firstRow) throw new Error('no rows');
    await user.click(within(firstRow).getByRole('button', { name: /^Delete transaction from/ }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(await screen.findByText('Could not delete the transaction')).toBeInTheDocument();
    expect(
      screen.getByText(/breaks a later transaction on .*: not enough cash/),
    ).toBeInTheDocument();
    expect(db.transactions[0]?.type).toBe('deposit');
  });

  it('opens the form to edit a row', async () => {
    const { user } = await open();
    const firstRow = bodyRows()[0];
    if (!firstRow) throw new Error('no rows');
    await user.click(within(firstRow).getByRole('button', { name: /^Edit transaction from/ }));
    expect(await screen.findByRole('dialog', { name: 'Edit transaction' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
