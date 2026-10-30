import { describe, expect, it, vi } from 'vitest';
import { readAllPages } from './fleet.service';

describe('complete cursor reads', () => {
  it('loads all 120 records rather than silently accepting the first 100', async () => {
    const records = Array.from({ length: 120 }, (_, index) => ({ id: `id-${index}` }));
    const fetch = vi.fn(async (cursor?: string) => cursor
      ? { items: records.slice(100), hasNextPage: false, endCursor: null }
      : { items: records.slice(0, 100), hasNextPage: true, endCursor: 'page-2' });
    expect(await readAllPages(fetch)).toEqual(records);
    expect(fetch.mock.calls).toEqual([[undefined], ['page-2']]);
  });
  it('returns an honestly empty collection', async () => {
    expect(await readAllPages(async () => ({ items: [], hasNextPage: false }))).toEqual([]);
  });
  it('rejects missing cursors instead of exposing partial results', async () => {
    await expect(readAllPages(async () => ({ items: [{ id: '1' }], hasNextPage: true }))).rejects.toThrow('pagination did not advance');
  });
  it('rejects duplicate records across pages', async () => {
    await expect(readAllPages(async (cursor) => ({
      items: [{ id: '1' }], hasNextPage: !cursor, endCursor: 'next',
    }))).rejects.toThrow('duplicate');
  });
  it('rejects non-advancing cursors and empty pages with more data', async () => {
    await expect(readAllPages(async (cursor) => ({
      items: [{ id: cursor ? '2' : '1' }], hasNextPage: true, endCursor: 'same',
    }))).rejects.toThrow('pagination did not advance');
    await expect(readAllPages(async () => ({
      items: [], hasNextPage: true, endCursor: 'next',
    }))).rejects.toThrow('pagination did not advance');
  });
  it('propagates a later-page permission failure without returning earlier rows', async () => {
    await expect(readAllPages(async (cursor) => {
      if (cursor) throw new Error('Permission denied');
      return { items: [{ id: '1' }], hasNextPage: true, endCursor: 'next' };
    })).rejects.toThrow('Permission denied');
  });
  it('bounds pagination when a backend continually claims more pages', async () => {
    let counter = 0;
    await expect(readAllPages(async () => ({
      items: [{ id: `${++counter}` }], hasNextPage: true, endCursor: `${counter}`,
    }))).rejects.toThrow('safe pagination limit');
    expect(counter).toBe(100);
  });
  it('fails explicitly when a request never settles', async () => {
    vi.useFakeTimers();
    try {
      const request = readAllPages(() => new Promise<never>(() => {}));
      const assertion = expect(request).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(30_001);
      await assertion;
    } finally { vi.useRealTimers(); }
  });
});
