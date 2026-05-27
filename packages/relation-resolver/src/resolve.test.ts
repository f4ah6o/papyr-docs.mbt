import { describe, expect, it } from 'vitest';
import { resolveRelations } from './resolve.js';

describe('resolveRelations', () => {
  it('derives child and backlink relations from valid stored edges', () => {
    const result = resolveRelations({
      documentIds: ['book', 'chapter', 'note'],
      relations: [
        { source: 'chapter', target: 'book', rel: 'parent', metadata: { order: 1 } },
        { source: 'note', target: 'chapter', rel: 'reference' },
      ],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.resolvedRelations).toEqual([
      { source: 'book', target: 'chapter', rel: 'child', derived: true, metadata: { order: 1 } },
      { source: 'chapter', target: 'book', rel: 'parent', derived: false, metadata: { order: 1 } },
      { source: 'chapter', target: 'note', rel: 'backlink', derived: true },
      { source: 'note', target: 'chapter', rel: 'reference', derived: false },
    ]);
  });

  it('exposes diagnostics while still returning valid stored relations', () => {
    const result = resolveRelations({
      documentIds: ['a', 'b'],
      relations: [
        { source: 'a', target: 'missing', rel: 'reference' },
        { source: 'a', target: 'b', rel: 'reference' },
      ],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RELATION_TARGET_MISSING',
      }),
    ]);
    expect(result.relations).toEqual([{ source: 'a', target: 'b', rel: 'reference' }]);
  });
});
