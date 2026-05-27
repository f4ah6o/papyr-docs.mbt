import { describe, expect, it } from 'vitest';
import { projectBacklinks, projectGraph, projectTree } from './project.js';

describe('projectTree', () => {
  it('projects child relations into a deterministic tree', () => {
    const projection = projectTree({
      documentIds: ['book', 'chapter-b', 'chapter-a', 'article'],
      relations: [
        { source: 'book', target: 'chapter-b', rel: 'child', derived: true, metadata: { order: 2 } },
        { source: 'book', target: 'chapter-a', rel: 'child', derived: true, metadata: { order: 1 } },
      ],
    });

    expect(projection.roots).toEqual(['article', 'book']);
    expect(projection.nodes.book?.childIds).toEqual(['chapter-a', 'chapter-b']);
    expect(projection.nodes['chapter-a']?.parentId).toBe('book');
    expect(projection.leafRoots).toEqual(['article']);
  });
});

describe('projectBacklinks', () => {
  it('groups backlink relations by source document', () => {
    expect(
      projectBacklinks({
        documentIds: ['a', 'b', 'c'],
        relations: [
          { source: 'b', target: 'a', rel: 'backlink', derived: true },
          { source: 'b', target: 'c', rel: 'backlink', derived: true },
        ],
      }),
    ).toEqual({
      a: [],
      b: ['a', 'c'],
      c: [],
    });
  });
});

describe('projectGraph', () => {
  it('preserves the resolved edge set in a stable order', () => {
    expect(
      projectGraph([
        { source: 'b', target: 'a', rel: 'backlink', derived: true },
        { source: 'a', target: 'b', rel: 'reference', derived: false },
      ]),
    ).toEqual([
      { source: 'a', target: 'b', rel: 'reference', derived: false },
      { source: 'b', target: 'a', rel: 'backlink', derived: true },
    ]);
  });
});
