import type { PapyrDocument } from '@f12o/papyr-core';
import { describe, it } from 'vitest';
import type { BackendAdapter } from './adapter.js';
import { assertBackendAdapterConformance } from './testing.js';

describe('BackendAdapter', () => {
  it('is satisfiable by a minimal in-memory implementation', async () => {
    await assertBackendAdapterConformance({
      createAdapter() {
        const store = new Map<string, PapyrDocument>();
        const adapter: BackendAdapter = {
          async list(query = {}) {
            const items = [...store.values()];
            return {
              items: query.limit !== undefined ? items.slice(0, query.limit) : items,
            };
          },
          async get(id) {
            return store.get(id) ?? null;
          },
          async put(doc) {
            store.set(doc.id, doc);
          },
          async delete(id) {
            store.delete(id);
          },
        };
        return adapter;
      },
    });
  });
});
