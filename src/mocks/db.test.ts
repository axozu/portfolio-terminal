import { describe, expect, it } from 'vitest';
import type { TransactionInput } from '@/shared/model';
import { TEST_TODAY } from '@/test/mockApi';
import { MockDb } from './db';
import { LAYER_SCHEMA_VERSION, LAYER_STORAGE_KEY, loadLayer } from './persistence';

const deposit: TransactionInput = {
  type: 'deposit',
  date: TEST_TODAY,
  ticker: null,
  quantity: null,
  price: null,
  amount: 500,
  fee: 0,
};

function createDb(today = TEST_TODAY) {
  let counter = 0;
  return new MockDb({ today, storage: localStorage, createId: () => `user-${String(++counter)}` });
}

describe('MockDb', () => {
  it('starts with the generated ledger and no notice', () => {
    const db = createDb();
    expect(db.transactions.length).toBeGreaterThan(100);
    expect(db.hasUserChanges).toBe(false);
    expect(db.startupNotice).toBeNull();
    expect(localStorage.getItem(LAYER_STORAGE_KEY)).toBeNull();
  });

  it('persists user changes and restores them on the next start', () => {
    const db = createDb();
    const initialDeposit = db.transactions[0];
    if (initialDeposit?.type !== 'deposit') throw new Error('expected the initial deposit');
    const added = db.add(deposit);
    db.update(initialDeposit.id, { ...initialDeposit, amount: initialDeposit.amount + 1 });
    expect(db.transactions.at(-1)).toEqual(added);

    const restored = createDb();
    expect(restored.findTransaction(added.id)).toEqual(added);
    expect(restored.findTransaction(initialDeposit.id)).toMatchObject({
      amount: initialDeposit.amount + 1,
    });
    expect(restored.startupNotice).toBeNull();
  });

  it('keeps an edited generated transaction in place', () => {
    const db = createDb();
    const target = db.transactions[5];
    if (!target) throw new Error('no generated transaction');
    db.update(target.id, { ...target, note: 'edited' });
    expect(db.transactions[5]).toMatchObject({ id: target.id, note: 'edited' });
  });

  it('removes generated transactions by id and user ones from the layer', () => {
    const db = createDb();
    const lastGenerated = db.transactions.at(-1);
    if (!lastGenerated) throw new Error('no generated transaction');
    const added = db.add(deposit);
    db.remove(added.id);
    db.remove(lastGenerated.id);
    expect(db.findTransaction(lastGenerated.id)).toBeUndefined();
    const stored = loadLayer(localStorage);
    expect(stored).toMatchObject({
      status: 'ok',
      layer: { added: [], deleted: [lastGenerated.id] },
    });
  });

  it('reset clears the layer and storage', () => {
    const db = createDb();
    db.add(deposit);
    db.reset();
    expect(db.hasUserChanges).toBe(false);
    expect(localStorage.getItem(LAYER_STORAGE_KEY)).toBeNull();
  });

  it('drops a layer with another schema version and reports it', () => {
    localStorage.setItem(
      LAYER_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: LAYER_SCHEMA_VERSION + 1,
        generatedFor: TEST_TODAY,
        added: [],
        updated: [],
        deleted: ['x'],
      }),
    );
    const db = createDb();
    expect(db.startupNotice).toBe('demo_data_refreshed');
    expect(db.hasUserChanges).toBe(false);
    expect(localStorage.getItem(LAYER_STORAGE_KEY)).toBeNull();
  });

  it('drops corrupt storage', () => {
    localStorage.setItem(LAYER_STORAGE_KEY, '{not json');
    expect(createDb().startupNotice).toBe('demo_data_refreshed');
  });

  it('drops a layer that no longer fits the shifted history', () => {
    // Слой сохранён «вчера» с продажей, которая теперь больше позиции.
    localStorage.setItem(
      LAYER_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: LAYER_SCHEMA_VERSION,
        generatedFor: '2026-11-23',
        added: [
          {
            id: 'user-x',
            type: 'sell',
            date: TEST_TODAY,
            ticker: 'SOL',
            quantity: 1e6,
            price: 1,
            amount: null,
            fee: 0,
          },
        ],
        updated: [],
        deleted: [],
      }),
    );
    const db = createDb();
    expect(db.startupNotice).toBe('demo_data_refreshed');
    expect(db.findTransaction('user-x')).toBeUndefined();
  });

  it('keeps a still-valid layer after the date moves forward', () => {
    createDb('2026-11-23').add({ ...deposit, date: '2026-11-23' });
    const db = createDb();
    expect(db.startupNotice).toBeNull();
    expect(db.findTransaction('user-1')).toBeDefined();
    expect(loadLayer(localStorage)).toMatchObject({ layer: { generatedFor: TEST_TODAY } });
  });

  it('works without storage', () => {
    const db = new MockDb({ today: TEST_TODAY, storage: null });
    expect(db.add(deposit).id).toMatch(/^user-/);
  });
});
