import type { RelationKind, StoredRelationKind } from '@f12o/papyr-relation';

export interface RelationKindRule {
  stored: boolean;
  inverse?: RelationKind;
  deriveInverse?: boolean;
  maxOutgoing?: number;
  acyclic?: boolean;
}

export interface RelationPolicy {
  kinds: Record<RelationKind, RelationKindRule>;
}

const DEFAULT_POLICY = {
  parent: {
    stored: true,
    inverse: 'child',
    deriveInverse: true,
    maxOutgoing: 1,
    acyclic: true,
  },
  child: {
    stored: false,
    inverse: 'parent',
  },
  reference: {
    stored: true,
    inverse: 'backlink',
    deriveInverse: true,
  },
  backlink: {
    stored: false,
    inverse: 'reference',
  },
  dependency: {
    stored: true,
    acyclic: true,
  },
  sequence: {
    stored: true,
  },
  tag: {
    stored: true,
  },
} satisfies RelationPolicy['kinds'];

export const papyrRelationPolicy: RelationPolicy = {
  kinds: DEFAULT_POLICY,
};

export function createRelationPolicy(
  overrides: Partial<Record<RelationKind, Partial<RelationKindRule>>> = {},
): RelationPolicy {
  return {
    kinds: {
      parent: { ...DEFAULT_POLICY.parent, ...overrides.parent },
      child: { ...DEFAULT_POLICY.child, ...overrides.child },
      reference: { ...DEFAULT_POLICY.reference, ...overrides.reference },
      backlink: { ...DEFAULT_POLICY.backlink, ...overrides.backlink },
      dependency: { ...DEFAULT_POLICY.dependency, ...overrides.dependency },
      sequence: { ...DEFAULT_POLICY.sequence, ...overrides.sequence },
      tag: { ...DEFAULT_POLICY.tag, ...overrides.tag },
    },
  };
}

export function getRelationKindRule(policy: RelationPolicy, kind: RelationKind): RelationKindRule {
  return policy.kinds[kind];
}

export function getInverseRelationKind(
  policy: RelationPolicy,
  kind: RelationKind,
): RelationKind | undefined {
  return getRelationKindRule(policy, kind).inverse;
}

export function shouldDeriveInverse(policy: RelationPolicy, kind: RelationKind): boolean {
  return getRelationKindRule(policy, kind).deriveInverse === true;
}

export function getMaxOutgoingRelations(
  policy: RelationPolicy,
  kind: StoredRelationKind,
): number | undefined {
  return getRelationKindRule(policy, kind).maxOutgoing;
}

export function isAcyclicRelationKind(policy: RelationPolicy, kind: StoredRelationKind): boolean {
  return getRelationKindRule(policy, kind).acyclic === true;
}
