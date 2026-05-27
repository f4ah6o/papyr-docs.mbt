import { assertBackendAdapterConformance } from '@f12o/papyr-backend/testing';
import { describe, expect, it } from 'vitest';
import { createKvAdapter } from './kv.js';

function createMockKv(): { kv: KVNamespace; rawStore: Map<string, string> } {
  const rawStore = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return rawStore.get(key) ?? null;
    },
    async put(key: string, value: string) {
      rawStore.set(key, value);
    },
    async delete(key: string) {
      rawStore.delete(key);
    },
    async list({
      prefix = '',
      limit = 1_000,
      cursor,
    }: { prefix?: string; limit?: number; cursor?: string } = {}) {
      const matchingKeys = [...rawStore.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort((left, right) => left.localeCompare(right));
      const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
      const keys = matchingKeys.slice(startIndex, startIndex + limit).map((name) => ({ name }));
      const nextIndex = startIndex + keys.length;
      const listComplete = nextIndex >= matchingKeys.length;
      return {
        keys,
        list_complete: listComplete,
        cursor: listComplete ? '' : String(nextIndex),
      };
    },
  } as unknown as KVNamespace;
  return { kv, rawStore };
}

describe('createKvAdapter', () => {
  it('satisfies the portable BackendAdapter contract', async () => {
    const { kv } = createMockKv();
    await assertBackendAdapterConformance({
      createAdapter: () => createKvAdapter({ kv }),
      supportsPagination: true,
    });
  });

  it('uses the provided KV namespace for get/put/delete', async () => {
    const { kv, rawStore } = createMockKv();
    const adapter = createKvAdapter({ kv, prefix: 'docs:' });
    await adapter.put({ id: 'a', blocks: [] });
    expect(rawStore.has('docs:a')).toBe(true);
    expect((await adapter.get('a'))?.id).toBe('a');
    expect((await adapter.list()).items).toHaveLength(1);
    await adapter.delete('a');
    expect(await adapter.get('a')).toBeNull();
  });
});
