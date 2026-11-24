import { describe, expect, it, vi } from 'vitest';
import { createTxFactory } from '@/test/fixtures/transactions';
import { applyLayer, emptyLayer, LAYER_STORAGE_KEY, loadLayer, saveLayer } from './persistence';

const tx = createTxFactory();
const base = [
  tx.deposit('2024-01-02', 100),
  tx.deposit('2024-01-03', 200),
  tx.deposit('2024-01-04', 300),
];

describe('applyLayer', () => {
  it('replaces updated in place, drops deleted and appends added', () => {
    const [first, second, third] = base;
    if (!first || !second || !third) throw new Error('fixture');
    const added = tx.deposit('2024-01-03', 5);
    const result = applyLayer(base, {
      ...emptyLayer('2024-01-05'),
      added: [added],
      updated: [{ ...third, amount: 999 }],
      deleted: [second.id],
    });
    expect(result).toEqual([first, { ...third, amount: 999 }, added]);
  });
});

describe('loadLayer / saveLayer', () => {
  it('round-trips a layer through storage', () => {
    const layer = { ...emptyLayer('2024-01-05'), deleted: ['a'] };
    saveLayer(localStorage, layer);
    expect(loadLayer(localStorage)).toEqual({ status: 'ok', layer });
  });

  it('removes the key for an empty layer', () => {
    localStorage.setItem(LAYER_STORAGE_KEY, 'x');
    saveLayer(localStorage, emptyLayer('2024-01-05'));
    expect(localStorage.getItem(LAYER_STORAGE_KEY)).toBeNull();
    expect(loadLayer(localStorage)).toEqual({ status: 'missing' });
  });

  it('flags malformed content as invalid', () => {
    localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, added: 'nope' }));
    expect(loadLayer(localStorage)).toEqual({ status: 'invalid' });
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: vi.fn(),
    } as unknown as Storage;
    expect(loadLayer(broken)).toEqual({ status: 'missing' });
    expect(() => {
      saveLayer(broken, { ...emptyLayer('2024-01-05'), deleted: ['a'] });
    }).not.toThrow();
  });
});
