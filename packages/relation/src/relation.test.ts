import { describe, expect, it } from 'vitest';
import {
  dedupeRawRelations,
  isDerivedRelationKind,
  isRelationKind,
  isStoredRelationKind,
  parseRawRelation,
  sortResolvedRelations,
} from './relation.js';

describe('relation kinds', () => {
  it('distinguishes stored and derived kinds', () => {
    expect(isStoredRelationKind('parent')).toBe(true);
    expect(isStoredRelationKind('child')).toBe(false);
    expect(isDerivedRelationKind('backlink')).toBe(true);
    expect(isRelationKind('dependency')).toBe(true);
    expect(isRelationKind('unknown')).toBe(false);
  });
});

describe('parseRawRelation', () => {
  it('accepts a serializable relation edge', () => {
    expect(
      parseRawRelation({
        source: 'chapter-a',
        target: 'book-a',
        rel: 'parent',
        metadata: { order: 1, label: 'Chapter' },
      }),
    ).toEqual({
      source: 'chapter-a',
      target: 'book-a',
      rel: 'parent',
      metadata: { order: 1, label: 'Chapter' },
    });
  });

  it('rejects unknown relation kinds', () => {
    expect(() =>
      parseRawRelation({
        source: 'chapter-a',
        target: 'book-a',
        rel: 'unknown',
      }),
    ).toThrow();
  });
});

describe('relation sorting helpers', () => {
  it('dedupes raw relations deterministically', () => {
    expect(
      dedupeRawRelations([
        { source: 'a', target: 'b', rel: 'reference' },
        { source: 'a', target: 'b', rel: 'reference' },
        { source: 'a', target: 'c', rel: 'reference' },
      ]),
    ).toEqual([
      { source: 'a', target: 'b', rel: 'reference' },
      { source: 'a', target: 'c', rel: 'reference' },
    ]);
  });

  it('sorts resolved relations by edge key and derived flag', () => {
    expect(
      sortResolvedRelations([
        { source: 'a', target: 'b', rel: 'child', derived: true },
        { source: 'a', target: 'b', rel: 'child', derived: false },
        { source: 'a', target: 'c', rel: 'child', derived: false },
      ]),
    ).toEqual([
      { source: 'a', target: 'b', rel: 'child', derived: false },
      { source: 'a', target: 'b', rel: 'child', derived: true },
      { source: 'a', target: 'c', rel: 'child', derived: false },
    ]);
  });
});
