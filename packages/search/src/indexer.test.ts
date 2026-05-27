import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { headingBlock, listBlock, mermaidBlock, paragraphBlock, tableBlock } from '@f12o/papyr-core';
import { flattenBlocks, papyrDocumentArbitrary, safeTextArbitrary } from '@f12o/papyr-test-support';
import { blockText, extractSnippet, toIndexable } from './indexer.js';

describe('toIndexable', () => {
  it('collects headings separately and exposes per-block snapshots', () => {
    const idx = toIndexable({
      id: 'd',
      title: 'T',
      blocks: [
        headingBlock({ id: 'h1', level: 1, content: [{ text: 'Intro' }] }),
        paragraphBlock({ id: 'p1', content: [{ text: 'Body text.' }] }),
        headingBlock({ id: 'h2', level: 2, content: [{ text: 'Details' }] }),
      ],
    });
    expect(idx.headings).toBe('Intro\nDetails');
    expect(idx.body).toContain('Body text.');
    expect(idx.blocks.map((b) => b.id)).toEqual(['h1', 'p1', 'h2']);
    expect(idx.blocks[0]?.type).toBe('heading');
  });

  it('extracts text from tables and mermaid blocks', () => {
    expect(
      blockText(
        tableBlock({
          id: 't',
          columns: [{ key: 'a', header: 'A' }],
          rows: [[{ text: 'cell-1' }, { text: 'cell-2' }]],
        }),
      ),
    ).toBe('cell-1 cell-2');
    expect(blockText(mermaidBlock({ id: 'm', source: 'graph TD; A-->B;' }))).toBe(
      'graph TD; A-->B;',
    );
  });

  it('indexes nested list item blocks and heading boosts', () => {
    const idx = toIndexable({
      id: 'd',
      title: 'T',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                headingBlock({ id: 'h1', level: 2, content: [{ text: 'Nested' }] }),
                paragraphBlock({ id: 'p1', content: [{ text: 'Body' }] }),
                mermaidBlock({ id: 'm1', source: 'graph TD; A-->B;' }),
              ],
            },
          ],
        }),
      ],
    });
    expect(idx.headings).toContain('Nested');
    expect(idx.body).toContain('Body');
    expect(idx.blocks.map((block) => block.id)).toEqual(['l1', 'h1', 'p1', 'm1']);
  });
});

describe('extractSnippet', () => {
  it('returns a fragment around the first matching term', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const snippet = extractSnippet(text, 'fox', 10);
    expect(snippet).toContain('fox');
    expect(snippet?.length).toBeLessThan(text.length);
  });

  it('returns null when no term matches', () => {
    expect(extractSnippet('nothing here', 'absent')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(extractSnippet('Hello World', 'world')).toContain('World');
  });

  it('returns a snippet containing the generated query term', () => {
    fc.assert(
      fc.property(
        safeTextArbitrary,
        safeTextArbitrary,
        safeTextArbitrary,
        (prefix, term, suffix) => {
          const text = `${prefix} ${term} ${suffix}`;
          const snippet = extractSnippet(text, term.toUpperCase(), 20);
          expect(snippet).not.toBeNull();
          const queryTerms = term
            .toLowerCase()
            .split(/\s+/)
            .map((part) => part.trim())
            .filter(Boolean);
          expect(queryTerms.some((queryTerm) => snippet?.toLowerCase().includes(queryTerm))).toBe(
            true,
          );
        },
      ),
      { numRuns: 40 },
    );
  });
});

describe('property-based indexing invariants', () => {
  it('creates one block snapshot per flattened block with matching text', () => {
    fc.assert(
      fc.property(papyrDocumentArbitrary({ maxBlocks: 4, maxDepth: 2 }), (doc) => {
        const idx = toIndexable(doc);
        const flattened = flattenBlocks(doc.blocks);
        expect(idx.blocks).toEqual(
          flattened.map((block) => ({
            id: block[1].id,
            type: block[0].toLowerCase(),
            text: blockText(block),
          })),
        );
      }),
      { numRuns: 40 },
    );
  });
});
