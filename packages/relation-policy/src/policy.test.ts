import { describe, expect, it } from 'vitest';
import {
  createRelationPolicy,
  getInverseRelationKind,
  getMaxOutgoingRelations,
  papyrRelationPolicy,
  shouldDeriveInverse,
} from './policy.js';

describe('papyrRelationPolicy', () => {
  it('derives child and backlink relations from stored edges', () => {
    expect(getInverseRelationKind(papyrRelationPolicy, 'parent')).toBe('child');
    expect(getInverseRelationKind(papyrRelationPolicy, 'reference')).toBe('backlink');
    expect(shouldDeriveInverse(papyrRelationPolicy, 'parent')).toBe(true);
    expect(shouldDeriveInverse(papyrRelationPolicy, 'dependency')).toBe(false);
  });

  it('limits parent relations to one outgoing edge by default', () => {
    expect(getMaxOutgoingRelations(papyrRelationPolicy, 'parent')).toBe(1);
    expect(getMaxOutgoingRelations(papyrRelationPolicy, 'reference')).toBeUndefined();
  });

  it('supports targeted overrides', () => {
    const policy = createRelationPolicy({
      dependency: {
        inverse: 'reference',
      },
    });

    expect(getInverseRelationKind(policy, 'dependency')).toBe('reference');
  });
});
