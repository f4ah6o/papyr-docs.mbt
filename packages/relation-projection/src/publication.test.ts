import { describe, expect, it, vi } from 'vitest';
import {
  assertPublicationTreeState,
  buildPublicationTreeState,
  formatRelationDiagnostic,
  listChapterIdsForBook,
  warnPublicationTreeDiagnostics,
} from './publication.js';

describe('publication relation helpers', () => {
  it('builds a chapter tree from publication metadata', () => {
    const state = buildPublicationTreeState({
      docs: [
        { id: 'book' },
        { id: 'chapter-2', meta: { kind: 'chapter', bookId: 'book', chapterOrder: 2 } },
        { id: 'chapter-1', meta: { kind: 'chapter', bookId: 'book', chapterOrder: 1 } },
      ],
      getPublicationMeta: (doc) => doc.meta ?? null,
    });

    expect(state.diagnostics).toEqual([]);
    expect(listChapterIdsForBook('book', state)).toEqual(['chapter-1', 'chapter-2']);
  });

  it('formats and warns for diagnostics without throwing', () => {
    const state = buildPublicationTreeState({
      docs: [{ id: 'book' }, { id: 'broken', meta: { kind: 'chapter', bookId: 'missing', chapterOrder: 1 } }],
      getPublicationMeta: (doc) => doc.meta ?? null,
    });
    const warn = vi.fn();

    expect(formatRelationDiagnostic(state.diagnostics[0]!)).toContain('RELATION_TARGET_MISSING');
    warnPublicationTreeDiagnostics(state, 'runtime book payload', warn);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('runtime book payload relation validation warning.'));
    expect(() => assertPublicationTreeState(state, 'docs build')).toThrow('relation validation failed');
  });

  it('surfaces invalid chapter helper metadata before relation resolution', () => {
    const state = buildPublicationTreeState({
      docs: [
        { id: 'book' },
        { id: 'broken', meta: { kind: 'chapter', bookId: '   ', chapterOrder: 0 } },
      ],
      getPublicationMeta: (doc) => doc.meta ?? null,
    });

    expect(state.diagnostics).toEqual([
      expect.objectContaining({
        code: 'PUBLICATION_CHAPTER_METADATA_INVALID',
        documentId: 'broken',
        message: expect.stringContaining('bookId, chapterOrder'),
      }),
    ]);
    expect(formatRelationDiagnostic(state.diagnostics[0]!)).toContain('PUBLICATION_CHAPTER_METADATA_INVALID');
  });
});
