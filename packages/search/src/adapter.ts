import type { PapyrDocument } from '@f12o/papyr-core';
import type { BlockSnapshot } from './indexer.js';

export interface BlockMatch {
  /** Block id within the matching document */
  blockId: string;
  /** Block kind, e.g. "heading", "paragraph", "table" */
  type: BlockSnapshot['type'];
  /** Short fragment of the block text containing the matched term(s) */
  snippet: string;
}

export interface SearchResult {
  id: string;
  score: number;
  /** First-line snippets across the document — one per matching block, when available. */
  blockMatches?: BlockMatch[];
}

export interface SearchAdapter {
  add(doc: PapyrDocument): void;
  remove(id: string): void;
  search(query: string): SearchResult[];
  clear(): void;
}
