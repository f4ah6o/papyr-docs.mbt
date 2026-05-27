import { describe, expect, it } from 'vitest';
import { headingBlock, mermaidBlock, paragraphBlock } from '@f12o/papyr-core';
import { createMiniSearchAdapter } from './minisearch.js';

describe('createMiniSearchAdapter', () => {
  it('indexes documents and returns hits', () => {
    const adapter = createMiniSearchAdapter();
    adapter.add({
      id: 'd1',
      title: 'Hello world',
      blocks: [paragraphBlock({ id: 'p1', content: [{ text: 'fox jumps over' }] })],
    });
    adapter.add({
      id: 'd2',
      title: 'Mermaid demo',
      blocks: [mermaidBlock({ id: 'm1', source: 'graph TD; cat-->dog;' })],
    });

    const fox = adapter.search('fox');
    expect(fox.map((r) => r.id)).toContain('d1');

    const cat = adapter.search('cat');
    expect(cat.map((r) => r.id)).toContain('d2');
  });

  it('removes documents from the index', () => {
    const adapter = createMiniSearchAdapter();
    adapter.add({ id: 'x', title: 'unique-token-zzz', blocks: [] });
    expect(adapter.search('unique-token-zzz')).toHaveLength(1);
    adapter.remove('x');
    expect(adapter.search('unique-token-zzz')).toHaveLength(0);
  });

  it('boosts matches in headings above body matches', () => {
    const adapter = createMiniSearchAdapter();
    adapter.add({
      id: 'with-heading',
      blocks: [
        headingBlock({ id: 'h', level: 1, content: [{ text: 'kintone integration' }] }),
        paragraphBlock({ id: 'p', content: [{ text: 'unrelated body' }] }),
      ],
    });
    adapter.add({
      id: 'body-only',
      blocks: [
        paragraphBlock({
          id: 'p',
          content: [{ text: 'kintone is mentioned only in body text here' }],
        }),
      ],
    });
    const results = adapter.search('kintone');
    expect(results[0]?.id).toBe('with-heading');
  });

  it('attaches blockMatches with a snippet for matching blocks', () => {
    const adapter = createMiniSearchAdapter();
    adapter.add({
      id: 'd',
      blocks: [
        headingBlock({ id: 'h1', level: 1, content: [{ text: 'About databases' }] }),
        paragraphBlock({
          id: 'p1',
          content: [
            { text: 'Lorem ipsum and then we discuss kintone in some detail before moving on.' },
          ],
        }),
      ],
    });
    const [hit] = adapter.search('kintone');
    expect(hit?.blockMatches?.[0]?.blockId).toBe('p1');
    expect(hit?.blockMatches?.[0]?.snippet).toContain('kintone');
    expect(hit?.blockMatches?.[0]?.type).toBe('paragraph');
  });
});
