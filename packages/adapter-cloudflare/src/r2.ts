import type { BackendAdapter, ListQuery, ListResult } from '@f12o/papyr-backend';
import type { PapyrDocument } from '@f12o/papyr-core';

export interface R2AdapterOptions {
  bucket: R2Bucket;
  prefix?: string;
}

export function createR2Adapter(options: R2AdapterOptions): BackendAdapter {
  const { bucket } = options;
  const prefix = options.prefix ?? 'papyr/';
  const key = (id: string) => `${prefix}${id}.json`;

  return {
    async list(query: ListQuery = {}): Promise<ListResult> {
      if (query.limit === 0) {
        return { items: [] };
      }
      const listed = await bucket.list({ prefix, limit: query.limit, cursor: query.cursor });
      const fetched = await Promise.all(
        listed.objects.map(async (obj) => {
          const body = await bucket.get(obj.key);
          return body ? (JSON.parse(await body.text()) as PapyrDocument) : null;
        }),
      );
      const items = fetched.filter((d): d is PapyrDocument => d !== null);
      return {
        items,
        nextCursor: listed.truncated ? listed.cursor : undefined,
      };
    },
    async get(id: string): Promise<PapyrDocument | null> {
      const body = await bucket.get(key(id));
      if (!body) return null;
      const text = await body.text();
      return JSON.parse(text) as PapyrDocument;
    },
    async put(doc: PapyrDocument): Promise<void> {
      await bucket.put(key(doc.id), JSON.stringify(doc));
    },
    async delete(id: string): Promise<void> {
      await bucket.delete(key(id));
    },
  };
}
