import {
  dedupeResolvedRelations,
  sortResolvedRelations,
  type RawRelation,
  type ResolvedRelation,
  type StoredRelation,
} from '@f12o/papyr-relation';
import {
  getInverseRelationKind,
  papyrRelationPolicy,
  shouldDeriveInverse,
  type RelationPolicy,
} from '@f12o/papyr-relation-policy';
import {
  checkRelations,
  type CheckRelationsResult,
  type RelationDiagnostic,
} from '@f12o/papyr-relation-check';

export interface ResolveRelationsOptions {
  documentIds: readonly string[];
  relations: readonly RawRelation[];
  policy?: RelationPolicy;
}

export interface ResolveRelationsResult extends CheckRelationsResult {
  relations: StoredRelation[];
  resolvedRelations: ResolvedRelation[];
  diagnostics: RelationDiagnostic[];
}

export function resolveRelations(options: ResolveRelationsOptions): ResolveRelationsResult {
  const policy = options.policy ?? papyrRelationPolicy;
  const checked = checkRelations({
    documentIds: options.documentIds,
    relations: options.relations,
    policy,
  });

  const storedRelations = checked.relations.map<ResolvedRelation>((relation) => ({
    ...relation,
    derived: false,
  }));
  const derivedRelations = checked.relations.flatMap((relation) =>
    deriveRelationInverse(relation, policy),
  );

  return {
    relations: checked.relations,
    resolvedRelations: sortResolvedRelations(
      dedupeResolvedRelations([...storedRelations, ...derivedRelations]),
    ),
    diagnostics: checked.diagnostics,
  };
}

function deriveRelationInverse(
  relation: StoredRelation,
  policy: RelationPolicy,
): ResolvedRelation[] {
  if (!shouldDeriveInverse(policy, relation.rel)) return [];
  const inverse = getInverseRelationKind(policy, relation.rel);
  if (!inverse) return [];

  return [
    {
      source: relation.target,
      target: relation.source,
      rel: inverse,
      derived: true,
      ...(relation.metadata && { metadata: relation.metadata }),
    },
  ];
}
