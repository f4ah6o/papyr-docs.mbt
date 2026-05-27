import {
  dedupeRawRelations,
  isStoredRelationKind,
  sortRawRelations,
  type RawRelation,
  type StoredRelation,
  type StoredRelationKind,
} from '@f12o/papyr-relation';
import {
  getMaxOutgoingRelations,
  isAcyclicRelationKind,
  papyrRelationPolicy,
  type RelationPolicy,
} from '@f12o/papyr-relation-policy';

export type RelationDiagnosticCode =
  | 'RELATION_SOURCE_MISSING'
  | 'RELATION_TARGET_MISSING'
  | 'RELATION_KIND_UNKNOWN'
  | 'RELATION_DUPLICATE_PARENT'
  | 'RELATION_TREE_CYCLE'
  | 'RELATION_DEPENDENCY_CYCLE';

export interface RelationDiagnostic {
  code: RelationDiagnosticCode;
  message: string;
  documentId?: string;
  relation?: RawRelation;
  relatedDocumentIds?: string[];
}

export interface CheckRelationsOptions {
  documentIds: readonly string[];
  relations: readonly RawRelation[];
  policy?: RelationPolicy;
}

export interface CheckRelationsResult {
  relations: StoredRelation[];
  diagnostics: RelationDiagnostic[];
}

export function checkRelations(options: CheckRelationsOptions): CheckRelationsResult {
  const policy = options.policy ?? papyrRelationPolicy;
  const documentIds = [...new Set(options.documentIds)].sort();
  const documents = new Set(documentIds);
  const diagnostics: RelationDiagnostic[] = [];
  const normalized: StoredRelation[] = [];

  for (const relation of sortRawRelations(options.relations)) {
    if (!documents.has(relation.source)) {
      diagnostics.push({
        code: 'RELATION_SOURCE_MISSING',
        message: `relation source "${relation.source}" does not exist`,
        relation,
        documentId: relation.source,
      });
      continue;
    }

    if (!documents.has(relation.target)) {
      diagnostics.push({
        code: 'RELATION_TARGET_MISSING',
        message: `relation target "${relation.target}" does not exist`,
        relation,
        documentId: relation.target,
      });
      continue;
    }

    if (!isStoredRelationKind(relation.rel)) {
      diagnostics.push({
        code: 'RELATION_KIND_UNKNOWN',
        message: `relation kind "${relation.rel}" is not allowed in raw relation storage`,
        relation,
      });
      continue;
    }

    normalized.push({
      source: relation.source,
      target: relation.target,
      rel: relation.rel,
      ...(relation.metadata && { metadata: relation.metadata }),
    });
  }

  const relations = dedupeRawRelations(normalized) as StoredRelation[];
  diagnostics.push(...collectDuplicateParentDiagnostics(relations, policy));
  diagnostics.push(...collectCycleDiagnostics(relations, policy));

  return {
    relations,
    diagnostics: diagnostics.sort(compareDiagnostics),
  };
}

function collectDuplicateParentDiagnostics(
  relations: readonly StoredRelation[],
  policy: RelationPolicy,
): RelationDiagnostic[] {
  const maxOutgoing = getMaxOutgoingRelations(policy, 'parent');
  if (maxOutgoing === undefined) return [];

  const parentTargetsByDocument = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.rel !== 'parent') continue;
    const targets = parentTargetsByDocument.get(relation.source) ?? [];
    targets.push(relation.target);
    parentTargetsByDocument.set(relation.source, targets);
  }

  const diagnostics: RelationDiagnostic[] = [];
  for (const [documentId, targets] of parentTargetsByDocument) {
    const uniqueTargets = [...new Set(targets)].sort();
    if (uniqueTargets.length <= maxOutgoing) continue;
    diagnostics.push({
      code: 'RELATION_DUPLICATE_PARENT',
      message: `document "${documentId}" has multiple parent relations`,
      documentId,
      relatedDocumentIds: uniqueTargets,
    });
  }
  return diagnostics;
}

function collectCycleDiagnostics(
  relations: readonly StoredRelation[],
  policy: RelationPolicy,
): RelationDiagnostic[] {
  const diagnostics: RelationDiagnostic[] = [];

  for (const kind of ['parent', 'dependency'] as const satisfies StoredRelationKind[]) {
    if (!isAcyclicRelationKind(policy, kind)) continue;

    const cycles = findCycles(relations.filter((relation) => relation.rel === kind));
    for (const cycle of cycles) {
      diagnostics.push({
        code: kind === 'parent' ? 'RELATION_TREE_CYCLE' : 'RELATION_DEPENDENCY_CYCLE',
        message: `relation cycle detected: ${cycle.join(' -> ')}`,
        documentId: cycle[0],
        relatedDocumentIds: cycle,
      });
    }
  }

  return diagnostics;
}

function findCycles(relations: readonly StoredRelation[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    const targets = adjacency.get(relation.source) ?? [];
    targets.push(relation.target);
    adjacency.set(relation.source, [...new Set(targets)].sort());
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];
  const cycles = new Map<string, string[]>();

  type Frame = {
    node: string;
    nextIndex: number;
    targets: readonly string[];
  };

  for (const node of [...adjacency.keys()].sort()) {
    if (visited.has(node)) continue;

    const stack: Frame[] = [];
    visiting.add(node);
    path.push(node);
    stack.push({
      node,
      nextIndex: 0,
      targets: adjacency.get(node) ?? [],
    });

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) break;

      if (frame.nextIndex >= frame.targets.length) {
        stack.pop();
        path.pop();
        visiting.delete(frame.node);
        visited.add(frame.node);
        continue;
      }

      const next = frame.targets[frame.nextIndex];
      frame.nextIndex += 1;
      if (!next) continue;

      if (visiting.has(next)) {
        const cycleStart = path.indexOf(next);
        if (cycleStart >= 0) {
          const cycle = [...path.slice(cycleStart), next];
          cycles.set(canonicalizeCycle(cycle), cycle);
        }
        continue;
      }

      if (visited.has(next)) continue;

      visiting.add(next);
      path.push(next);
      stack.push({
        node: next,
        nextIndex: 0,
        targets: adjacency.get(next) ?? [],
      });
    }
  }

  return [...cycles.values()].sort((left, right) => left.join('\u0000').localeCompare(right.join('\u0000')));
}

function canonicalizeCycle(cycle: string[]): string {
  const body = cycle.slice(0, -1);
  if (body.length === 0) return '';
  const rotations = body.map((_, index) => {
    const rotated = [...body.slice(index), ...body.slice(0, index)];
    return [...rotated, rotated[0] ?? ''].join('\u0000');
  });
  rotations.sort();
  return rotations[0] ?? '';
}

function compareDiagnostics(left: RelationDiagnostic, right: RelationDiagnostic): number {
  return (
    left.code.localeCompare(right.code) ||
    (left.documentId ?? '').localeCompare(right.documentId ?? '') ||
    left.message.localeCompare(right.message)
  );
}
