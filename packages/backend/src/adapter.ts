import type { PapyrDocument } from '@f12o/papyr-core';

/**
 * Portable list query fields shared by every Papyr backend adapter.
 */
export interface ListQuery {
  /**
   * Upper bound on the number of documents returned by a single call.
   * `0` requests an empty page. Adapters may still impose a smaller
   * backend-specific cap for positive limits.
   */
  limit?: number;
  /**
   * Opaque pagination token previously returned as {@link ListResult.nextCursor}.
   * Adapters that do not paginate may ignore this field.
   */
  cursor?: string;
  /**
   * Adapter-specific extension point for backend-native filtering.
   * Portable callers should not assume a shared filter dialect across adapters.
   */
  filter?: Record<string, unknown>;
}

/**
 * Portable list result returned by {@link BackendAdapter.list}.
 */
export interface ListResult {
  /**
   * Documents returned for the current page/window. When {@link ListQuery.limit}
   * is provided, adapters should not return more than that many items.
   */
  items: PapyrDocument[];
  /**
   * Opaque pagination token for a follow-up {@link BackendAdapter.list} call.
   * Its format, stability, and ordering semantics are adapter-specific.
   */
  nextCursor?: string;
}

/**
 * Minimal portable search hit shape for adapters that implement search.
 */
export interface SearchHit {
  /**
   * Identifier of the matched document.
   */
  id: string;
  /**
   * Adapter-defined relevance score. Scores are only comparable within the same
   * result set, and higher scores should represent better matches.
   */
  score: number;
  /**
   * Optional adapter-provided snippet for display purposes.
   */
  snippet?: string;
}

/**
 * Portable CRUD contract for Papyr documents.
 */
export interface BackendAdapter {
  /**
   * Lists documents stored in the adapter.
   *
   * Portable guarantees:
   * - returned items are {@link PapyrDocument} objects
   * - when {@link ListQuery.limit} is provided, `items.length <= limit`
   * - `list({ limit: 0 })` returns an empty page
   * - when `nextCursor` is returned, callers may pass it back via `query.cursor`
   * - ordering is adapter-defined unless adapter-specific docs promise more
   * - `filter` remains adapter-specific and is not part of the portable contract
   */
  list(query?: ListQuery): Promise<ListResult>;
  /**
   * Returns the stored document for `id`, or `null` when the document is missing.
   */
  get(id: string): Promise<PapyrDocument | null>;
  /**
   * Creates or replaces the document stored under `doc.id`.
   */
  put(doc: PapyrDocument): Promise<void>;
  /**
   * Deletes the stored document for `id`. Calling this for a missing document
   * must be safe.
   */
  delete(id: string): Promise<void>;
  /**
   * Optional search capability.
   *
   * When implemented, the adapter should:
   * - return hits ordered from better to worse match
   * - populate `id` and numeric `score` on every hit
   * - include `snippet` only when it has a meaningful display fragment
   */
  search?(query: string): Promise<SearchHit[]>;
}
