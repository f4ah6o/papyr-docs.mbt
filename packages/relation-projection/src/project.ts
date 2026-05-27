import { sortResolvedRelations, type RelationKind, type ResolvedRelation } from '@f12o/papyr-relation';

export interface ProjectRelationOptions {
  documentIds: readonly string[];
  relations: readonly ResolvedRelation[];
}

export interface TreeProjectionNode {
  id: string;
  parentId?: string;
  childIds: string[];
}

export interface TreeProjection {
  roots: string[];
  leafRoots: string[];
  nodes: Record<string, TreeProjectionNode>;
}

export interface GraphEdge {
  source: string;
  target: string;
  rel: RelationKind;
  derived: boolean;
  metadata?: ResolvedRelation['metadata'];
}

export function projectTree(options: ProjectRelationOptions): TreeProjection {
  const documentIds = [...new Set(options.documentIds)].sort();
  const nodes: Record<string, TreeProjectionNode> = Object.fromEntries(
    documentIds.map((id) => [
      id,
      {
        id,
        childIds: [] as string[],
      } satisfies TreeProjectionNode,
    ]),
  ) as Record<string, TreeProjectionNode>;
  const childEdgesByParent = new Map<string, Array<{ childId: string; order: number }>>();
  const parentByChild = new Map<string, string>();

  for (const relation of sortResolvedRelations(options.relations)) {
    if (relation.rel !== 'child') continue;
    if (!(relation.source in nodes) || !(relation.target in nodes)) continue;

    if (!parentByChild.has(relation.target)) {
      const childNode = nodes[relation.target];
      if (!childNode) continue;
      parentByChild.set(relation.target, relation.source);
      nodes[relation.target] = {
        id: childNode.id,
        childIds: childNode.childIds,
        parentId: relation.source,
      };
    }

    const edges = childEdgesByParent.get(relation.source) ?? [];
    edges.push({
      childId: relation.target,
      order: relation.metadata?.order ?? Number.MAX_SAFE_INTEGER,
    });
    childEdgesByParent.set(relation.source, edges);
  }

  for (const [parentId, edges] of childEdgesByParent) {
    const parentNode = nodes[parentId];
    if (!parentNode) continue;
    nodes[parentId] = {
      id: parentNode.id,
      ...(parentNode.parentId && { parentId: parentNode.parentId }),
      childIds: edges
        .sort((left, right) => left.order - right.order || left.childId.localeCompare(right.childId))
        .map((edge) => edge.childId),
    };
  }

  const roots = documentIds.filter((id) => !nodes[id]?.parentId);
  return {
    roots,
    leafRoots: roots.filter((id) => (nodes[id]?.childIds.length ?? 0) === 0),
    nodes,
  };
}

export function projectBacklinks(options: ProjectRelationOptions): Record<string, string[]> {
  const backlinks: Record<string, string[]> = Object.fromEntries(
    [...new Set(options.documentIds)].sort().map((id) => [id, [] as string[]]),
  ) as Record<string, string[]>;

  for (const relation of sortResolvedRelations(options.relations)) {
    if (relation.rel !== 'backlink') continue;
    if (!(relation.source in backlinks) || !(relation.target in backlinks)) continue;
    backlinks[relation.source]?.push(relation.target);
  }

  for (const [documentId, items] of Object.entries(backlinks)) {
    backlinks[documentId] = [...new Set(items)].sort();
  }

  return backlinks;
}

export function projectGraph(relations: readonly ResolvedRelation[]): GraphEdge[] {
  return sortResolvedRelations(relations).map((relation) => ({
    source: relation.source,
    target: relation.target,
    rel: relation.rel,
    derived: relation.derived,
    ...(relation.metadata && { metadata: relation.metadata }),
  }));
}
