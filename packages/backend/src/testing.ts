import assert from 'node:assert/strict';
import type { PapyrDocument } from '@f12o/papyr-core';
import type { BackendAdapter, SearchHit } from './adapter.js';

export interface BackendSearchConformanceOptions {
  query: string;
  expectedIds: readonly string[];
  missingQuery?: string;
}

export interface BackendAdapterConformanceOptions {
  createAdapter: () => BackendAdapter | Promise<BackendAdapter>;
  supportsPagination?: boolean;
  search?: BackendSearchConformanceOptions;
  seedDocuments?: readonly PapyrDocument[];
}

export const backendAdapterConformanceDocuments: readonly PapyrDocument[] = Object.freeze([
  { id: 'doc-1', title: 'Doc 1', blocks: [] },
  { id: 'doc-2', title: 'Doc 2', blocks: [] },
  { id: 'doc-3', title: 'Doc 3', blocks: [] },
]);

export async function assertBackendAdapterConformance(
  options: BackendAdapterConformanceOptions,
): Promise<void> {
  const adapter = await options.createAdapter();
  const documents = cloneDocuments(options.seedDocuments ?? backendAdapterConformanceDocuments);
  const [firstDocument, secondDocument] = documents;

  if (documents.length < 2 || !firstDocument || !secondDocument) {
    throw new Error('assertBackendAdapterConformance requires at least two seed documents');
  }

  assert.strictEqual(
    await adapter.get('missing-document'),
    null,
    'get() should return null for a missing document',
  );

  await adapter.delete('missing-document');

  const emptyList = await adapter.list();
  assert.deepStrictEqual(
    emptyList.items,
    [],
    'list() should start empty for a fresh adapter under test',
  );

  await Promise.all(documents.map(async (document) => adapter.put(document)));

  const listed = await adapter.list();
  assertDocumentSetEqual(listed.items, documents, 'list() should return the stored documents');

  await Promise.all(
    documents.map(async (document) => {
      assert.deepStrictEqual(
        await adapter.get(document.id),
        document,
        `get(${document.id}) should return the stored document`,
      );
    }),
  );

  const limited = await adapter.list({ limit: 2 });
  assert.ok(limited.items.length <= 2, 'list({ limit }) should respect the requested upper bound');
  assertItemsAreKnown(
    limited.items,
    documents,
    'list({ limit }) should only return previously stored documents',
  );

  const zeroLimited = await adapter.list({ limit: 0 });
  assert.deepStrictEqual(
    zeroLimited.items,
    [],
    'list({ limit: 0 }) should return an empty page',
  );

  if (options.supportsPagination) {
    await assertPaginationContract(adapter, documents);
  }

  const updatedDocument: PapyrDocument = {
    ...secondDocument,
    title: `${secondDocument.title ?? secondDocument.id} (updated)`,
  };
  await adapter.put(updatedDocument);
  assert.deepStrictEqual(
    await adapter.get(updatedDocument.id),
    updatedDocument,
    'put() should replace the document stored under the same id',
  );

  await adapter.delete(firstDocument.id);
  assert.strictEqual(
    await adapter.get(firstDocument.id),
    null,
    'delete() should remove the stored document',
  );

  const remainingDocuments = [updatedDocument, ...documents.slice(2)];
  const afterDelete = await adapter.list();
  assertDocumentSetEqual(
    afterDelete.items,
    remainingDocuments,
    'list() should reflect updates and deletions',
  );

  if (options.search) {
    await assertSearchContract(adapter, options.search);
  }
}

async function assertPaginationContract(
  adapter: BackendAdapter,
  expectedDocuments: readonly PapyrDocument[],
): Promise<void> {
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  await collectPaginatedIds(
    adapter,
    expectedDocuments,
    seenIds,
    seenCursors,
    expectedDocuments.length + 1,
  );

  assert.deepStrictEqual(
    [...seenIds].sort(),
    expectedDocuments.map((document) => document.id).sort(),
    're-feeding nextCursor should allow traversal of all stored documents',
  );
}

async function collectPaginatedIds(
  adapter: BackendAdapter,
  expectedDocuments: readonly PapyrDocument[],
  seenIds: Set<string>,
  seenCursors: Set<string>,
  remainingPages: number,
  cursor?: string,
): Promise<void> {
  if (remainingPages <= 0) {
    return;
  }

  const page = await adapter.list({ limit: 1, ...(cursor ? { cursor } : {}) });
  assert.ok(page.items.length <= 1, 'paginated list() calls should continue to respect limit');
  assertItemsAreKnown(
    page.items,
    expectedDocuments,
    'paginated list() should only return previously stored documents',
  );

  for (const item of page.items) {
    seenIds.add(item.id);
  }

  if (page.nextCursor === undefined) {
    return;
  }

  assert.ok(page.nextCursor.length > 0, 'nextCursor should not be an empty string');
  assert.notStrictEqual(page.nextCursor, cursor, 'nextCursor should move pagination forward');
  assert.ok(!seenCursors.has(page.nextCursor), 'nextCursor should not repeat during traversal');

  seenCursors.add(page.nextCursor);
  await collectPaginatedIds(
    adapter,
    expectedDocuments,
    seenIds,
    seenCursors,
    remainingPages - 1,
    page.nextCursor,
  );
}

async function assertSearchContract(
  adapter: BackendAdapter,
  options: BackendSearchConformanceOptions,
): Promise<void> {
  if (!adapter.search) {
    throw new Error('search conformance requested, but adapter.search is undefined');
  }

  const hits = await adapter.search(options.query);
  let previousScore = Number.POSITIVE_INFINITY;

  const actualIds = hits.map((hit) => {
    assertSearchHit(hit);
    assert.ok(
      hit.score <= previousScore,
      'search() should order hits from better to worse match',
    );
    previousScore = hit.score;
    return hit.id;
  });

  assert.deepStrictEqual(
    actualIds,
    [...options.expectedIds],
    'search() should return the expected hit ids',
  );

  if (options.missingQuery) {
    assert.deepStrictEqual(
      await adapter.search(options.missingQuery),
      [],
      'search() should return an empty array when there are no matches',
    );
  }
}

function assertSearchHit(hit: SearchHit): void {
  assert.strictEqual(typeof hit.id, 'string', 'search hit ids should be strings');
  assert.ok(Number.isFinite(hit.score), 'search hit scores should be finite numbers');
  if (hit.snippet !== undefined) {
    assert.strictEqual(typeof hit.snippet, 'string', 'search hit snippets should be strings');
  }
}

function assertDocumentSetEqual(
  actual: readonly PapyrDocument[],
  expected: readonly PapyrDocument[],
  message: string,
): void {
  assert.deepStrictEqual(sortDocuments(actual), sortDocuments(expected), message);
}

function assertItemsAreKnown(
  actual: readonly PapyrDocument[],
  expected: readonly PapyrDocument[],
  message: string,
): void {
  const expectedIds = new Set(expected.map((document) => document.id));
  for (const document of actual) {
    assert.ok(expectedIds.has(document.id), message);
  }
}

function sortDocuments(documents: readonly PapyrDocument[]): PapyrDocument[] {
  return [...documents].sort((left, right) => left.id.localeCompare(right.id));
}

function cloneDocuments(documents: readonly PapyrDocument[]): PapyrDocument[] {
  return documents.map((document) => structuredClone(document));
}
