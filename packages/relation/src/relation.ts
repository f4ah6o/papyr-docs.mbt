import * as v from 'valibot';

export const StoredRelationKindSchema = v.picklist([
  'parent',
  'reference',
  'dependency',
  'sequence',
  'tag',
]);
export type StoredRelationKind = v.InferOutput<typeof StoredRelationKindSchema>;

export const DerivedRelationKindSchema = v.picklist(['child', 'backlink']);
export type DerivedRelationKind = v.InferOutput<typeof DerivedRelationKindSchema>;

export const RelationKindSchema = v.picklist([
  'parent',
  'child',
  'reference',
  'backlink',
  'dependency',
  'sequence',
  'tag',
]);
export type RelationKind = v.InferOutput<typeof RelationKindSchema>;

export const RelationMetadataSchema = v.object({
  label: v.optional(v.string()),
  order: v.optional(v.number()),
});
export type RelationMetadata = v.InferOutput<typeof RelationMetadataSchema>;

export const RawRelationSchema = v.object({
  source: v.string(),
  target: v.string(),
  rel: RelationKindSchema,
  metadata: v.optional(RelationMetadataSchema),
});
export type RawRelation = v.InferOutput<typeof RawRelationSchema>;

export interface StoredRelation extends Omit<RawRelation, 'rel'> {
  rel: StoredRelationKind;
}

export interface ResolvedRelation extends Omit<RawRelation, 'rel'> {
  rel: RelationKind;
  derived: boolean;
}

export function isStoredRelationKind(value: unknown): value is StoredRelationKind {
  return (
    value === 'parent' ||
    value === 'reference' ||
    value === 'dependency' ||
    value === 'sequence' ||
    value === 'tag'
  );
}

export function isDerivedRelationKind(value: unknown): value is DerivedRelationKind {
  return value === 'child' || value === 'backlink';
}

export function isRelationKind(value: unknown): value is RelationKind {
  return isStoredRelationKind(value) || isDerivedRelationKind(value);
}

export function parseRawRelation(input: unknown): RawRelation {
  return v.parse(RawRelationSchema, input);
}

export function compareRawRelations(left: RawRelation, right: RawRelation): number {
  return (
    left.source.localeCompare(right.source) ||
    left.target.localeCompare(right.target) ||
    left.rel.localeCompare(right.rel) ||
    compareRelationMetadata(left.metadata, right.metadata)
  );
}

export function compareResolvedRelations(left: ResolvedRelation, right: ResolvedRelation): number {
  return (
    left.source.localeCompare(right.source) ||
    left.target.localeCompare(right.target) ||
    left.rel.localeCompare(right.rel) ||
    Number(left.derived) - Number(right.derived) ||
    compareRelationMetadata(left.metadata, right.metadata)
  );
}

export function sortRawRelations<T extends RawRelation>(relations: readonly T[]): T[] {
  return [...relations].sort(compareRawRelations);
}

export function sortResolvedRelations<T extends ResolvedRelation>(relations: readonly T[]): T[] {
  return [...relations].sort(compareResolvedRelations);
}

export function dedupeRawRelations<T extends RawRelation>(relations: readonly T[]): T[] {
  const deduped = new Map<string, T>();
  for (const relation of sortRawRelations(relations)) {
    deduped.set(createRawRelationKey(relation), relation);
  }
  return [...deduped.values()];
}

export function dedupeResolvedRelations<T extends ResolvedRelation>(relations: readonly T[]): T[] {
  const deduped = new Map<string, T>();
  for (const relation of sortResolvedRelations(relations)) {
    deduped.set(createResolvedRelationKey(relation), relation);
  }
  return [...deduped.values()];
}

export function createRawRelationKey(relation: RawRelation): string {
  return [
    relation.source,
    relation.target,
    relation.rel,
    relation.metadata?.order ?? '',
    relation.metadata?.label ?? '',
  ].join('\u0000');
}

export function createResolvedRelationKey(relation: ResolvedRelation): string {
  return `${createRawRelationKey(relation)}\u0000${relation.derived ? 'derived' : 'stored'}`;
}

function compareRelationMetadata(
  left: RelationMetadata | undefined,
  right: RelationMetadata | undefined,
): number {
  const leftOrder = left?.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right?.order ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || (left?.label ?? '').localeCompare(right?.label ?? '');
}
