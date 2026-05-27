import type { PapyrDocument } from '@f12o/papyr-core';
import { createMiniSearchAdapter, type SearchResult } from '@f12o/papyr-search';

type AdapterState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<SearchEngine> }
  | { status: 'ready'; engine: SearchEngine }
  | { status: 'error'; message: string };

export interface SearchEngine {
  search(query: string): SearchResult[];
  documents: Map<string, PapyrDocument>;
}

let state: AdapterState = { status: 'idle' };

export async function ensureSearchEngine(): Promise<SearchEngine> {
  if (state.status === 'ready') return state.engine;
  if (state.status === 'loading') return state.promise;

  const promise = loadIndex();
  state = { status: 'loading', promise };
  try {
    const engine = await promise;
    state = { status: 'ready', engine };
    return engine;
  } catch (error) {
    const message = error instanceof Error ? error.message : '検索インデックスを読み込めませんでした';
    state = { status: 'error', message };
    throw new Error(message);
  }
}

async function loadIndex(): Promise<SearchEngine> {
  const response = await fetch('/search-index.json', { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`検索インデックスの取得に失敗しました (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  const documents = extractDocuments(payload);

  const adapter = createMiniSearchAdapter();
  const map = new Map<string, PapyrDocument>();
  for (const doc of documents) {
    adapter.add(doc);
    map.set(doc.id, doc);
  }

  return {
    search: (query: string) => (query.trim() ? adapter.search(query.trim()) : []),
    documents: map,
  };
}

function extractDocuments(payload: unknown): PapyrDocument[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('search-index.json の形式が不正です');
  }
  const list = (payload as { documents?: unknown }).documents;
  if (!Array.isArray(list)) {
    throw new Error('search-index.json に documents 配列がありません');
  }
  const result: PapyrDocument[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const doc = entry as PapyrDocument;
    if (typeof doc.id !== 'string' || !Array.isArray(doc.blocks)) continue;
    result.push(doc);
  }
  return result;
}
