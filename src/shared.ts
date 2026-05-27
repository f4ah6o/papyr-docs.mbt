import type { HeadingBlock, PapyrDocument } from '@f12o/papyr-core';
import { isBlockKind } from '@f12o/papyr-core';

export type PublicationKind = 'article' | 'book' | 'chapter';
export type PublicationSection = 'getting-started' | 'use-case' | 'package' | 'article';

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt?: string;
}

export interface PublicationMetaBase {
  kind: PublicationKind;
  section: PublicationSection;
  slug: string;
  emoji?: string;
  summary: string;
  published: boolean;
  topics: string[];
}

export interface ArticlePublicationMeta extends PublicationMetaBase {
  kind: 'article';
}

export interface BookPublicationMeta extends PublicationMetaBase {
  kind: 'book';
}

export interface ChapterPublicationMeta extends PublicationMetaBase {
  kind: 'chapter';
  bookId: string;
  chapterOrder: number;
}

export type PublicationMeta = ArticlePublicationMeta | BookPublicationMeta | ChapterPublicationMeta;

export interface PublicationSummary extends DocumentSummary {
  kind: PublicationKind;
  section: PublicationSection;
  slug: string;
  emoji?: string;
  summary: string;
  published: boolean;
  topics: string[];
  bookId?: string;
  chapterOrder?: number;
}

export interface PublicationsListResponse {
  items: PublicationSummary[];
}

export interface BookPayload {
  book: PapyrDocument;
  chapters: PapyrDocument[];
}

export interface ManifestBookEntry {
  chapterIds: string[];
}

export interface DocumentManifest {
  version: 1;
  generatedAt: string;
  publications: PublicationSummary[];
  books: Record<string, ManifestBookEntry>;
}

export interface PublicationOrderLike {
  id: string;
  title: string;
  updatedAt?: string;
}

export interface PublicationFilters {
  kind?: PublicationKind;
  section?: PublicationSection;
  published?: boolean;
}

export type RawMarkdownRoute =
  | { kind: 'article'; slug: string }
  | { kind: 'book'; slug: string }
  | { kind: 'chapter'; bookSlug: string; chapterSlug: string };

export type AppRoute =
  | { name: 'home' }
  | { name: 'articles' }
  | { name: 'use-cases' }
  | { name: 'article'; slug: string }
  | { name: 'books' }
  | { name: 'book'; slug: string }
  | { name: 'chapter'; bookSlug: string; chapterSlug: string }
  | { name: 'design-system' }
  | { name: 'playground' }
  | { name: 'advanced-playground' }
  | { name: 'search'; query: string }
  | { name: 'not-found'; pathname: string };

export function summarizeDocument(doc: PapyrDocument): DocumentSummary {
  const updatedAt = getUpdatedAt(doc);
  return {
    id: doc.id,
    title: deriveTitle(doc),
    ...(updatedAt && { updatedAt }),
  };
}

export function summarizePublication(doc: PapyrDocument): PublicationSummary | null {
  const publication = getPublicationMeta(doc);
  if (!publication) return null;

  const updatedAt = getUpdatedAt(doc);
  return {
    id: doc.id,
    title: deriveTitle(doc),
    kind: publication.kind,
    section: publication.section,
    slug: publication.slug,
    summary: publication.summary,
    published: publication.published,
    topics: publication.topics,
    ...(updatedAt && { updatedAt }),
    ...(publication.emoji && { emoji: publication.emoji }),
    ...('bookId' in publication && { bookId: publication.bookId }),
    ...('chapterOrder' in publication && { chapterOrder: publication.chapterOrder }),
  };
}

export function listPublicationSummaries(docs: PapyrDocument[]): PublicationSummary[] {
  return sortPublicationSummaries(
    docs
      .map((doc) => summarizePublication(doc))
      .filter((summary): summary is PublicationSummary => summary !== null),
  );
}

const publicationCollator = new Intl.Collator('en', {
  sensitivity: 'base',
  ignorePunctuation: false,
  numeric: true,
});

export function comparePublicationText(left: string, right: string): number {
  return publicationCollator.compare(left, right);
}

export function comparePublicationOrder(
  left: PublicationOrderLike,
  right: PublicationOrderLike,
): number {
  const leftUpdatedAt = left.updatedAt ?? '';
  const rightUpdatedAt = right.updatedAt ?? '';
  return (
    comparePublicationText(rightUpdatedAt, leftUpdatedAt) ||
    comparePublicationText(left.title, right.title) ||
    comparePublicationText(left.id, right.id)
  );
}

export function sortPublicationSummaries(summaries: PublicationSummary[]): PublicationSummary[] {
  return [...summaries].sort(comparePublicationOrder);
}

export function sortChapters(docs: PapyrDocument[]): PapyrDocument[] {
  return [...docs].sort((left, right) => {
    const leftMeta = getPublicationMeta(left);
    const rightMeta = getPublicationMeta(right);
    const leftOrder =
      leftMeta?.kind === 'chapter' ? leftMeta.chapterOrder : Number.MAX_SAFE_INTEGER;
    const rightOrder =
      rightMeta?.kind === 'chapter' ? rightMeta.chapterOrder : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || comparePublicationText(deriveTitle(left), deriveTitle(right));
  });
}

export function filterPublicationSummaries(
  summaries: PublicationSummary[],
  filters: PublicationFilters,
): PublicationSummary[] {
  return summaries.filter((summary) => {
    if (filters.kind && summary.kind !== filters.kind) return false;
    if (filters.section && summary.section !== filters.section) return false;
    if (typeof filters.published === 'boolean' && summary.published !== filters.published)
      return false;
    return true;
  });
}

export function getPublicationMeta(doc: PapyrDocument): PublicationMeta | null {
  return parsePublicationMeta(doc.meta?.publication);
}

export function parsePublicationMeta(value: unknown): PublicationMeta | null {
  if (!isObject(value)) return null;

  const kind = value.kind;
  const section = value.section;
  const slug = normalizeText(value.slug);
  const summary = typeof value.summary === 'string' ? value.summary.trim() : null;
  const published = value.published;
  if (
    !isPublicationKind(kind) ||
    !isPublicationSection(section) ||
    !slug ||
    summary === null ||
    typeof published !== 'boolean'
  ) {
    return null;
  }

  const emoji = normalizeText(value.emoji) ?? undefined;
  const base = {
    section,
    slug,
    summary,
    published,
    topics: normalizeTopics(value.topics),
    ...(emoji && { emoji }),
  };

  if (kind === 'chapter') {
    const bookId = normalizeText(value.bookId);
    const chapterOrder = value.chapterOrder;
    if (
      !bookId ||
      typeof chapterOrder !== 'number' ||
      !Number.isInteger(chapterOrder) ||
      chapterOrder < 1
    ) {
      return null;
    }
    return {
      ...base,
      kind,
      bookId,
      chapterOrder,
    };
  }

  return {
    ...base,
    kind,
  };
}

export function isPublicationKind(value: unknown): value is PublicationKind {
  return value === 'article' || value === 'book' || value === 'chapter';
}

export function isPublicationSection(value: unknown): value is PublicationSection {
  return (
    value === 'getting-started' ||
    value === 'use-case' ||
    value === 'package' ||
    value === 'article'
  );
}

export function withUpdatedAt(doc: PapyrDocument, updatedAt: string): PapyrDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      updatedAt,
    },
  };
}

export function withPublicationMeta(
  doc: PapyrDocument,
  publication: PublicationMeta,
): PapyrDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      publication,
    },
  };
}

export function getUpdatedAt(doc: PapyrDocument): string | undefined {
  const value = doc.meta?.updatedAt;
  return typeof value === 'string' ? value : undefined;
}

export function resolveAppRoute(pathname: string, search = ''): AppRoute {
  const segments = pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return { name: 'home' };

  if (segments[0] === 'playground' && segments.length === 1) {
    return { name: 'playground' };
  }

  if (segments[0] === 'playground' && segments[1] === 'advanced' && segments.length === 2) {
    return { name: 'advanced-playground' };
  }

  if (segments[0] === 'use-cases' && segments.length === 1) {
    return { name: 'use-cases' };
  }

  if (segments[0] === 'design-system' && segments.length === 1) {
    return { name: 'design-system' };
  }

  if (segments[0] === 'search' && segments.length === 1) {
    const query = new URLSearchParams(search).get('q') ?? '';
    return { name: 'search', query };
  }

  if (segments[0] === 'articles') {
    if (segments.length === 1) return { name: 'articles' };
    const [, articleSlug] = segments;
    if (segments.length === 2 && articleSlug) {
      return { name: 'article', slug: decodeURIComponent(articleSlug) };
    }
  }

  if (segments[0] === 'books') {
    if (segments.length === 1) return { name: 'books' };
    const [, bookSlug, chapterSlug] = segments;
    if (segments.length === 2 && bookSlug) {
      return { name: 'book', slug: decodeURIComponent(bookSlug) };
    }
    if (segments.length === 3 && bookSlug && chapterSlug) {
      return {
        name: 'chapter',
        bookSlug: decodeURIComponent(bookSlug),
        chapterSlug: decodeURIComponent(chapterSlug),
      };
    }
  }

  return { name: 'not-found', pathname };
}

export function resolveRawMarkdownRoute(pathname: string): RawMarkdownRoute | null {
  const segments = pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (hasUnsafePathSegments(segments)) return null;

  const articleSegment = segments[1];
  if (segments[0] === 'articles' && segments.length === 2 && articleSegment) {
    const slug = decodeMarkdownSegment(articleSegment);
    return slug ? { kind: 'article', slug } : null;
  }

  if (segments[0] === 'books') {
    const bookSegment = segments[1];
    if (segments.length === 2 && bookSegment) {
      const slug = decodeMarkdownSegment(bookSegment);
      return slug ? { kind: 'book', slug } : null;
    }
    const chapterSegment = segments[2];
    if (segments.length === 3 && bookSegment && chapterSegment) {
      const bookSlug = decodePlainSegment(bookSegment);
      const chapterSlug = decodeMarkdownSegment(chapterSegment);
      if (bookSlug && chapterSlug) {
        return { kind: 'chapter', bookSlug, chapterSlug };
      }
    }
  }

  return null;
}

const LLM_USER_AGENT_TOKENS = [
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'anthropic-ai',
  'claude-user',
  'perplexitybot',
  'ccbot',
  'meta-externalagent',
  'bytespider',
  'cohere-ai',
  'mistralai-user',
  'duckassistbot',
  'amazonbot',
];

export function isLlmUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return LLM_USER_AGENT_TOKENS.some((token) => lower.includes(token));
}

export function resolveLlmRedirectTarget(pathname: string): string | null {
  const segments = pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (hasUnsafePathSegments(segments)) return null;

  const last = segments[segments.length - 1];
  if (last && last.toLowerCase().endsWith('.md')) return null;

  if (segments[0] === 'articles' && segments.length === 2 && segments[1]) {
    return `/articles/${segments[1]}.md`;
  }

  if (segments[0] === 'books') {
    if (segments.length === 2 && segments[1]) {
      return `/books/${segments[1]}.md`;
    }
    if (segments.length === 3 && segments[1] && segments[2]) {
      return `/books/${segments[1]}/${segments[2]}.md`;
    }
  }

  return null;
}

function hasUnsafePathSegments(segments: string[]): boolean {
  return segments.some((segment) => {
    try {
      const decoded = decodeURIComponent(segment);
      return decoded === '.' || decoded === '..';
    } catch {
      return true;
    }
  });
}

export function publicationHref(
  summary: Pick<PublicationSummary, 'kind' | 'slug'> & { kind: 'article' | 'book' },
): string {
  switch (summary.kind) {
    case 'article':
      return `/articles/${encodeURIComponent(summary.slug)}`;
    case 'book':
      return `/books/${encodeURIComponent(summary.slug)}`;
  }
}

export function chapterHref(bookSlug: string, chapterSlug: string): string {
  return `/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(chapterSlug)}`;
}

export function searchHref(query: string, section?: PublicationSection | 'all'): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (section && section !== 'all') params.set('section', section);
  const suffix = params.toString();
  return suffix ? `/search?${suffix}` : '/search';
}

export function findPublicationBySlug(
  summaries: PublicationSummary[],
  kind: Exclude<PublicationKind, 'chapter'>,
  slug: string,
): PublicationSummary | null {
  return summaries.find((summary) => summary.kind === kind && summary.slug === slug) ?? null;
}

export function findChapterBySlugs(
  summaries: PublicationSummary[],
  bookSlug: string,
  chapterSlug: string,
): {
  book: PublicationSummary & { kind: 'book' };
  chapter: PublicationSummary & { kind: 'chapter' };
} | null {
  const book =
    summaries.find(
      (summary): summary is PublicationSummary & { kind: 'book' } =>
        summary.kind === 'book' && summary.slug === bookSlug,
    ) ?? null;
  if (!book) return null;

  const chapter =
    summaries.find(
      (summary): summary is PublicationSummary & { kind: 'chapter' } =>
        summary.kind === 'chapter' && summary.bookId === book.id && summary.slug === chapterSlug,
    ) ?? null;
  if (!chapter) return null;

  return { book, chapter };
}

export function deriveTitle(doc: PapyrDocument): string {
  const explicit = doc.title?.trim();
  if (explicit) return explicit;

  const heading = doc.blocks.find((block): block is HeadingBlock => isBlockKind(block, 'Heading'));
  if (heading) {
    const headingText = heading[1].content
      .map((part) => part.text)
      .join('')
      .trim();
    if (headingText) return headingText;
  }

  return doc.id;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const topic = entry.trim();
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    normalized.push(topic);
  }

  return normalized;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function decodePlainSegment(segment: string): string | null {
  const value = decodeURIComponent(segment).trim();
  return value || null;
}

function decodeMarkdownSegment(segment: string): string | null {
  const value = decodePlainSegment(segment);
  if (!value || !value.endsWith('.md')) return null;
  const withoutExt = value.slice(0, -3).trim();
  return withoutExt || null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
