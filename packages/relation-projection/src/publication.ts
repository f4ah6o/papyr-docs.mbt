import { resolveRelations } from '@f12o/papyr-relation-resolver';
import type { RawRelation } from '@f12o/papyr-relation';
import { projectTree, type TreeProjection } from './project.js';

export interface PublicationRelationMeta {
  kind: string;
  bookId?: string;
  chapterOrder?: number;
}

export type PublicationRelationDiagnostic = ReturnType<
  typeof resolveRelations
>['diagnostics'][number];

export type PublicationTreeDiagnosticCode = 'PUBLICATION_CHAPTER_METADATA_INVALID';

export interface PublicationHelperDiagnostic {
  code: PublicationTreeDiagnosticCode;
  message: string;
  documentId: string;
  relatedDocumentIds?: string[];
}

export type PublicationTreeDiagnostic = PublicationRelationDiagnostic | PublicationHelperDiagnostic;

export interface PublicationTreeState {
  projection: TreeProjection;
  diagnostics: PublicationTreeDiagnostic[];
}

export interface BuildPublicationTreeStateOptions<TDoc extends { id: string }> {
  docs: readonly TDoc[];
  getPublicationMeta: (doc: TDoc) => PublicationRelationMeta | null;
}

export function buildPublicationTreeState<TDoc extends { id: string }>(
  options: BuildPublicationTreeStateOptions<TDoc>,
): PublicationTreeState {
  const allDocs = [...new Map(options.docs.map((doc) => [doc.id, doc] as const)).values()];
  const documentIds = allDocs.map((doc) => doc.id);
  const publicationProjection = allDocs.map((doc) =>
    publicationRelationsForDocument(doc, options.getPublicationMeta),
  );
  const resolved = resolveRelations({
    documentIds,
    relations: publicationProjection.flatMap((entry) => entry.relations),
  });

  return {
    projection: projectTree({
      documentIds,
      relations: resolved.resolvedRelations,
    }),
    diagnostics: [...publicationProjection.flatMap((entry) => entry.diagnostics), ...resolved.diagnostics].sort(
      comparePublicationDiagnostics,
    ),
  };
}

export function listChapterIdsForBook(bookId: string, state: PublicationTreeState): string[] {
  return state.projection.nodes[bookId]?.childIds ?? [];
}

export function assertPublicationTreeState(
  state: PublicationTreeState,
  context: string,
): PublicationTreeState {
  if (state.diagnostics.length === 0) return state;
  throw new Error(
    `${context} relation validation failed.\n${state.diagnostics
      .map((diagnostic) => formatRelationDiagnostic(diagnostic))
      .join('\n')}`,
  );
}

export function warnPublicationTreeDiagnostics(
  state: PublicationTreeState,
  context: string,
  warn: (message: string) => void = console.warn,
): PublicationTreeState {
  if (state.diagnostics.length === 0) return state;
  warn(
    `${context} relation validation warning.\n${state.diagnostics
      .map((diagnostic) => formatRelationDiagnostic(diagnostic))
      .join('\n')}`,
  );
  return state;
}

export function formatRelationDiagnostic(
  diagnostic: PublicationTreeState['diagnostics'][number],
): string {
  const related =
    diagnostic.relatedDocumentIds && diagnostic.relatedDocumentIds.length > 0
      ? ` [${diagnostic.relatedDocumentIds.join(' -> ')}]`
      : '';
  return `- [${diagnostic.code}] ${diagnostic.message}${related}`;
}

function publicationRelationsForDocument<TDoc extends { id: string }>(
  doc: TDoc,
  getPublicationMeta: (doc: TDoc) => PublicationRelationMeta | null,
) {
  const publication = getPublicationMeta(doc);
  if (publication?.kind !== 'chapter') {
    return {
      relations: [] as RawRelation[],
      diagnostics: [] as PublicationHelperDiagnostic[],
    };
  }

  const invalidFields: string[] = [];
  const normalizedBookId =
    typeof publication.bookId === 'string' && publication.bookId.trim()
      ? publication.bookId.trim()
      : null;
  if (!normalizedBookId) {
    invalidFields.push('bookId');
  }

  const normalizedChapterOrder =
    typeof publication.chapterOrder === 'number' &&
    Number.isInteger(publication.chapterOrder) &&
    publication.chapterOrder >= 1
      ? publication.chapterOrder
      : null;
  if (normalizedChapterOrder === null) {
    invalidFields.push('chapterOrder');
  }

  if (!normalizedBookId || normalizedChapterOrder === null) {
    return {
      relations: [] as RawRelation[],
      diagnostics: [
        {
          code: 'PUBLICATION_CHAPTER_METADATA_INVALID',
          message: `chapter document "${doc.id}" has invalid publication metadata: ${invalidFields.join(', ')}`,
          documentId: doc.id,
        },
      ] satisfies PublicationHelperDiagnostic[],
    };
  }

  return {
    relations: [
      {
        source: doc.id,
        target: normalizedBookId,
        rel: 'parent',
        metadata: {
          order: normalizedChapterOrder,
        },
      },
    ] satisfies RawRelation[],
    diagnostics: [] as PublicationHelperDiagnostic[],
  };
}

function comparePublicationDiagnostics(
  left: PublicationTreeDiagnostic,
  right: PublicationTreeDiagnostic,
): number {
  return (
    left.code.localeCompare(right.code) ||
    (left.documentId ?? '').localeCompare(right.documentId ?? '') ||
    left.message.localeCompare(right.message)
  );
}
