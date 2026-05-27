import type { BackendAdapter, ListQuery, ListResult } from '@f12o/papyr-backend';
import type { PapyrDocument } from '@f12o/papyr-core';

export interface D1AdapterOptions {
  db: D1Database;
  /** Table name. Default: "papyr_documents" */
  table?: string;
}

export function createD1Adapter(options: D1AdapterOptions): BackendAdapter {
  const { db } = options;
  const table = options.table ?? 'papyr_documents';

  return {
    async list(query: ListQuery = {}): Promise<ListResult> {
      if (query.limit === 0) {
        return { items: [] };
      }
      const limit = query.limit ?? 100;
      const stmt = db.prepare(`SELECT id, doc FROM ${table} ORDER BY id LIMIT ?`).bind(limit);
      const { results } = await stmt.all<{ id: string; doc: string }>();
      return {
        items: results.map((r) => JSON.parse(r.doc) as PapyrDocument),
      };
    },
    async get(id: string): Promise<PapyrDocument | null> {
      const row = await db
        .prepare(`SELECT doc FROM ${table} WHERE id = ?`)
        .bind(id)
        .first<{ doc: string }>();
      return row ? (JSON.parse(row.doc) as PapyrDocument) : null;
    },
    async put(doc: PapyrDocument): Promise<void> {
      await db
        .prepare(
          `INSERT INTO ${table} (id, doc) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc`,
        )
        .bind(doc.id, JSON.stringify(doc))
        .run();
    },
    async delete(id: string): Promise<void> {
      await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    },
  };
}
