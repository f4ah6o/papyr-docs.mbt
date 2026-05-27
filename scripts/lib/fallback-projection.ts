import type { PapyrDocument } from '@f12o/papyr-core';
import type { ArtifactFile, ProjectionInput } from './build-bridge.js';
import type {
  DocumentManifest,
  PublicationMeta,
  PublicationSection,
  PublicationSummary,
  BookPayload,
} from '../../src/shared.js';
import {
  comparePublicationOrder,
  listPublicationSummaries,
  sortChapters,
  withPublicationMeta,
  withUpdatedAt,
} from '../../src/shared.js';

interface PublicationRecord {
  source: string;
  document: PapyrDocument;
  summary: PublicationSummary;
}

export function buildFallbackArtifacts(input: ProjectionInput): ArtifactFile[] {
  const bookSlugsByDir = buildBookSlugsByDir(input);
  const documents = buildDocuments(input);
  const summaries = listPublicationSummaries(documents).sort(comparePublicationOrder);
  const manifest = buildManifest(summaries, input.generatedAt);

  const artifacts: ArtifactFile[] = [
    jsonArtifact('documents.json', { documents }),
    jsonArtifact('manifest.json', manifest),
    jsonArtifact('search-index.json', { documents }),
    jsonArtifact('r2/manifest.json', manifest),
    jsonArtifact('public-data/manifest.json', manifest),
  ];

  const publicationRecords = summaries
    .map((summary) => {
      const document = documents.find((doc) => doc.id === summary.id);
      if (!document) return null;
      const sourceEntry = input.sourceEntries.find(
        (entry) => document.id === buildDocumentId(entry.path, entry.frontmatter, bookSlugsByDir),
      );
      if (!sourceEntry) return null;
      return {
        source: sourceEntry.source,
        document,
        summary,
      } satisfies PublicationRecord;
    })
    .filter((record): record is PublicationRecord => record !== null);

  for (const record of publicationRecords) {
    artifacts.push(jsonArtifact(`r2/docs/${record.summary.id}.json`, record.document));
    artifacts.push(jsonArtifact(`public-data/docs/${record.summary.id}.json`, record.document));
    artifacts.push(textArtifact(`r2/raw/${record.summary.id}.md`, record.source));
    artifacts.push(textArtifact(`public-data/raw/${record.summary.id}.md`, record.source));
  }

  const books = summaries.filter(
    (summary): summary is PublicationSummary & { kind: 'book' } => summary.kind === 'book',
  );
  for (const book of books) {
    const bookDoc = documents.find((doc) => doc.id === book.id);
    if (!bookDoc) continue;
    const chapterIds = manifest.books[book.id]?.chapterIds ?? [];
    const chapterDocs = sortChapters(
      chapterIds
        .map((chapterId) => documents.find((doc) => doc.id === chapterId))
        .filter((doc): doc is PapyrDocument => doc !== undefined),
    );
    const payload: BookPayload = {
      book: bookDoc,
      chapters: chapterDocs,
    };
    artifacts.push(jsonArtifact(`r2/books/${book.id}.json`, payload));
    artifacts.push(jsonArtifact(`public-data/books/${book.id}.json`, payload));
  }

  return artifacts;
}

function buildDocuments(input: ProjectionInput): PapyrDocument[] {
  const bookSlugsByDir = buildBookSlugsByDir(input);
  return input.sourceEntries.map((entry) => {
    const publication = buildPublicationMeta(entry.path, entry.frontmatter, bookSlugsByDir);
    let document: PapyrDocument = {
      ...entry.document,
      id: buildDocumentId(entry.path, entry.frontmatter, bookSlugsByDir),
      title: resolveTitle(entry.frontmatter, entry.document.title),
    };

    document = withPublicationMeta(document, publication);

    const updatedAt =
      typeof entry.frontmatter.updatedAt === 'string' ? entry.frontmatter.updatedAt : null;
    if (updatedAt) {
      document = withUpdatedAt(document, updatedAt);
    }

    return document;
  });
}

function buildManifest(summaries: PublicationSummary[], generatedAt: string): DocumentManifest {
  const books = Object.fromEntries(
    summaries
      .filter(
        (summary): summary is PublicationSummary & { kind: 'book' } => summary.kind === 'book',
      )
      .map((book) => {
        const chapterIds = summaries
          .filter(
            (summary): summary is PublicationSummary & { kind: 'chapter' } =>
              summary.kind === 'chapter' && summary.bookId === book.id,
          )
          .sort((left, right) => {
            const leftOrder = left.chapterOrder ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = right.chapterOrder ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder || comparePublicationOrder(left, right);
          })
          .map((chapter) => chapter.id);
        return [book.id, { chapterIds }] as const;
      }),
  );

  return {
    version: 1,
    generatedAt,
    publications: summaries,
    books,
  };
}

function buildPublicationMeta(
  path: string,
  frontmatter: Record<string, unknown>,
  bookSlugsByDir: Map<string, string>,
): PublicationMeta {
  const section = resolveSection(path);
  const kind = resolveKind(frontmatter);
  const slug = expectString(frontmatter.slug, `slug is required for ${path}`);
  const summary = expectString(frontmatter.summary, `summary is required for ${path}`);
  const published = typeof frontmatter.published === 'boolean' ? frontmatter.published : false;
  const topics = Array.isArray(frontmatter.topics)
    ? frontmatter.topics.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const emoji = typeof frontmatter.emoji === 'string' ? frontmatter.emoji : undefined;

  if (kind === 'chapter') {
    const bookSlug = resolveBookSlug(path, bookSlugsByDir);
    const chapterOrder = expectInteger(
      frontmatter.chapterOrder,
      `chapterOrder is required for ${path}`,
    );
    return {
      kind,
      section,
      slug,
      summary,
      published,
      topics,
      ...(emoji ? { emoji } : {}),
      bookId: `book-${bookSlug}`,
      chapterOrder,
    };
  }

  return {
    kind,
    section,
    slug,
    summary,
    published,
    topics,
    ...(emoji ? { emoji } : {}),
  };
}

function buildDocumentId(
  path: string,
  frontmatter: Record<string, unknown>,
  bookSlugsByDir: Map<string, string>,
): string {
  const kind = resolveKind(frontmatter);
  const slug = expectString(frontmatter.slug, `slug is required for ${path}`);
  if (kind === 'chapter') {
    return `chapter-${resolveBookSlug(path, bookSlugsByDir)}-${slug}`;
  }
  return `${kind}-${slug}`;
}

function resolveSection(path: string): PublicationSection {
  const [root] = path.split('/');
  switch (root) {
    case 'getting-started':
      return 'getting-started';
    case 'use-cases':
      return 'use-case';
    case 'packages':
      return 'package';
    case 'articles':
      return 'article';
    default:
      throw new Error(`unsupported content section: ${path}`);
  }
}

function resolveKind(frontmatter: Record<string, unknown>): PublicationMeta['kind'] {
  const kind = frontmatter.kind;
  if (kind === 'article' || kind === 'book' || kind === 'chapter') {
    return kind;
  }
  throw new Error(`unsupported publication kind: ${String(kind)}`);
}

function buildBookSlugsByDir(input: ProjectionInput): Map<string, string> {
  const slugs = new Map<string, string>();
  for (const entry of input.sourceEntries) {
    if (resolveKind(entry.frontmatter) !== 'book') continue;
    slugs.set(
      resolveBookDir(entry.path),
      expectString(entry.frontmatter.slug, `slug is required for ${entry.path}`),
    );
  }
  return slugs;
}

function resolveBookSlug(path: string, bookSlugsByDir: Map<string, string>): string {
  const bookDir = resolveBookDir(path);
  return bookSlugsByDir.get(bookDir) ?? bookDir.split('/').at(-1) ?? bookDir;
}

function resolveBookDir(path: string): string {
  const segments = path.split('/');
  const chapterIndex = segments.indexOf('chapters');
  if (chapterIndex > 0) {
    return segments.slice(0, chapterIndex).join('/');
  }
  if (segments.length < 2) {
    throw new Error(`book slug cannot be resolved from path: ${path}`);
  }
  return segments.slice(0, -1).join('/');
}

function resolveTitle(frontmatter: Record<string, unknown>, fallback: string | undefined): string {
  if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
    return frontmatter.title.trim();
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim();
  }
  return 'Untitled';
}

function expectString(value: unknown, message: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(message);
}

function expectInteger(value: unknown, message: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  throw new Error(message);
}

function jsonArtifact(path: string, value: unknown): ArtifactFile {
  return {
    path,
    content: `${JSON.stringify(value, null, 2)}\n`,
  };
}

function textArtifact(path: string, value: string): ArtifactFile {
  return {
    path,
    content: value,
  };
}
