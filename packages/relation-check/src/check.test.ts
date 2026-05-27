import { describe, expect, it } from 'vitest';
import { checkRelations } from './check.js';

describe('checkRelations', () => {
  it('keeps valid stored relations', () => {
    const result = checkRelations({
      documentIds: ['book', 'chapter', 'note'],
      relations: [
        { source: 'chapter', target: 'book', rel: 'parent', metadata: { order: 2 } },
        { source: 'note', target: 'chapter', rel: 'reference' },
      ],
    });

    expect(result.relations).toEqual([
      { source: 'chapter', target: 'book', rel: 'parent', metadata: { order: 2 } },
      { source: 'note', target: 'chapter', rel: 'reference' },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports missing targets and unsupported kinds', () => {
    const result = checkRelations({
      documentIds: ['book'],
      relations: [
        { source: 'book', target: 'missing', rel: 'parent' },
        { source: 'book', target: 'book', rel: 'child' },
      ],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RELATION_KIND_UNKNOWN',
        relation: { source: 'book', target: 'book', rel: 'child' },
      }),
      expect.objectContaining({
        code: 'RELATION_TARGET_MISSING',
        relation: { source: 'book', target: 'missing', rel: 'parent' },
      }),
    ]);
  });

  it('reports duplicate parents and tree cycles deterministically', () => {
    const result = checkRelations({
      documentIds: ['book-a', 'book-b', 'chapter'],
      relations: [
        { source: 'chapter', target: 'book-a', rel: 'parent' },
        { source: 'chapter', target: 'book-b', rel: 'parent' },
        { source: 'book-a', target: 'chapter', rel: 'parent' },
      ],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RELATION_DUPLICATE_PARENT',
        documentId: 'chapter',
        relatedDocumentIds: ['book-a', 'book-b'],
      }),
      expect.objectContaining({
        code: 'RELATION_TREE_CYCLE',
        relatedDocumentIds: ['book-a', 'chapter', 'book-a'],
      }),
    ]);
  });

  it('reports dependency cycles separately', () => {
    const result = checkRelations({
      documentIds: ['a', 'b'],
      relations: [
        { source: 'a', target: 'b', rel: 'dependency' },
        { source: 'b', target: 'a', rel: 'dependency' },
      ],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RELATION_DEPENDENCY_CYCLE',
        relatedDocumentIds: ['a', 'b', 'a'],
      }),
    ]);
  });

  it('handles deep parent cycles without recursive stack growth', () => {
    const depth = 20000;
    const documentIds = Array.from({ length: depth }, (_, index) => `doc-${index}`);
    const relations = documentIds.slice(0, -1).map((documentId, index) => ({
      source: documentId,
      target: documentIds[index + 1] ?? '',
      rel: 'parent' as const,
    }));
    relations.push({
      source: documentIds[depth - 1] ?? '',
      target: documentIds[0] ?? '',
      rel: 'parent',
    });

    const result = checkRelations({
      documentIds,
      relations,
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RELATION_TREE_CYCLE',
        relatedDocumentIds: [...documentIds, documentIds[0]],
      }),
    ]);
  });
});
