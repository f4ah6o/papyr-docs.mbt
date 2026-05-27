import type { BackendAdapter, ListQuery, ListResult } from '@f12o/papyr-backend';
import type { PapyrDocument } from '@f12o/papyr-core';

export interface KvAdapterOptions {
  kv: KVNamespace;
  prefix?: string;
}

export function createKvAdapter(options: KvAdapterOptions): BackendAdapter {
  const { kv } = options;
  const prefix = options.prefix ?? 'papyr:';
  const key = (id: string) => `${prefix}${id}`;

  return {
    async list(query: ListQuery = {}): Promise<ListResult> {
      if (query.limit === 0) {
        return { items: [] };
      }
      const listed = await kv.list({ prefix, limit: query.limit, cursor: query.cursor });
      const fetched = await Promise.all(listed.keys.map((entry) => kv.get(entry.name)));
      const items = fetched
        .filter((raw): raw is string => raw !== null)
        .map((raw) => JSON.parse(raw) as PapyrDocument);
      return {
        items,
        nextCursor: listed.list_complete ? undefined : listed.cursor,
      };
    },
    async get(id: string): Promise<PapyrDocument | null> {
      const raw = await kv.get(key(id));
      return raw ? (JSON.parse(raw) as PapyrDocument) : null;
    },
    async put(doc: PapyrDocument): Promise<void> {
      await kv.put(key(doc.id), JSON.stringify(doc));
    },
    async delete(id: string): Promise<void> {
      await kv.delete(key(id));
    },
  };
}
