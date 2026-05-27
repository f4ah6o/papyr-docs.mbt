import MiniSearch from 'minisearch';
import type { PapyrDocument } from '@f12o/papyr-core';
import type { BlockMatch, SearchAdapter, SearchResult } from './adapter.js';
import { extractSnippet, toIndexable, type BlockSnapshot } from './indexer.js';

export interface MiniSearchAdapterOptions {
  /** Override fields to index. Default: ['title', 'headings', 'body'] */
  fields?: string[];
  /** Override fields stored alongside the index (besides id). */
  storeFields?: string[];
  /** Field boosts. Default boosts title and headings above body. */
  boost?: Record<string, number>;
  /** Maximum block matches to attach to each result. Default: 3. */
  maxBlockMatches?: number;
}

export function createMiniSearchAdapter(options: MiniSearchAdapterOptions = {}): SearchAdapter {
  const ms = new MiniSearch({
    fields: options.fields ?? ['title', 'headings', 'body'],
    storeFields: options.storeFields ?? ['id', 'blocks'],
    idField: 'id',
    searchOptions: {
      boost: options.boost ?? { title: 3, headings: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  const maxBlockMatches = options.maxBlockMatches ?? 3;

  return {
    add(doc: PapyrDocument) {
      ms.add(toIndexable(doc));
    },
    remove(id: string) {
      ms.discard(id);
    },
    search(query: string): SearchResult[] {
      return ms.search(query).map((r) => {
        const blocks = (r.blocks ?? []) as BlockSnapshot[];
        const matches: BlockMatch[] = [];
        for (const block of blocks) {
          if (matches.length >= maxBlockMatches) break;
          const snippet = extractSnippet(block.text, query);
          if (snippet) matches.push({ blockId: block.id, type: block.type, snippet });
        }
        return {
          id: String(r.id),
          score: r.score,
          ...(matches.length > 0 && { blockMatches: matches }),
        };
      });
    },
    clear() {
      ms.removeAll();
    },
  };
}
