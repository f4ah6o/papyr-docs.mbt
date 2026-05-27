import type { HeadingBlock, PapyrDocument } from '@f12o/papyr-core';
import { isBlockKind, parseDocument } from '@f12o/papyr-core';
import { parseMarkdown } from '@f12o/papyr-markdown';

export type WorkspacePublicationKind = 'article' | 'book' | 'chapter';

export interface WorkspacePublicationMetaBase {
  kind: WorkspacePublicationKind;
  slug: string;
  summary: string;
  published: boolean;
  topics: string[];
  emoji?: string;
}

export interface WorkspaceArticleMeta extends WorkspacePublicationMetaBase {
  kind: 'article';
}

export interface WorkspaceBookMeta extends WorkspacePublicationMetaBase {
  kind: 'book';
}

export interface WorkspaceChapterMeta extends WorkspacePublicationMetaBase {
  kind: 'chapter';
  bookId: string;
  chapterOrder: number;
}

export type WorkspacePublicationMeta =
  | WorkspaceArticleMeta
  | WorkspaceBookMeta
  | WorkspaceChapterMeta;

export interface WorkspacePublicationSummary {
  id: string;
  title: string;
  kind: WorkspacePublicationKind;
  slug: string;
  summary: string;
  published: boolean;
  topics: string[];
  emoji?: string;
  updatedAt?: string;
  bookId?: string;
  chapterOrder?: number;
}

export interface WorkspaceSiteConfig {
  title: string;
  tagline: string;
  homeIntro: string;
  logoEmoji?: string;
}

export interface PublishTargetConfig {
  endpoint: string;
  workspaceId: string;
  token?: string;
}

export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  documentOrder: string[];
}

export interface WorkspaceState {
  manifest: WorkspaceManifest;
  site: WorkspaceSiteConfig;
  documents: PapyrDocument[];
  publishTarget?: PublishTargetConfig;
}

export interface WorkspaceExportBundle {
  version: 1;
  exportedAt: string;
  manifest: WorkspaceManifest;
  site: WorkspaceSiteConfig;
  documents: PapyrDocument[];
  publishTarget?: Omit<PublishTargetConfig, 'token'>;
}

export interface WorkspaceValidationResult {
  valid: boolean;
  issues: string[];
}

export interface WorkspaceSearchIndexInput {
  site: WorkspaceSiteConfig;
  documents: PapyrDocument[];
}

export interface WorkspaceBookPayload {
  book: PapyrDocument;
  chapters: PapyrDocument[];
}

export function createStarterWorkspace(
  options: { id?: string; name?: string; now?: string } = {},
): WorkspaceState {
  const now = options.now ?? new Date().toISOString();
  const workspaceId = normalizeSlug(options.id ?? `workspace-${createWorkspaceToken()}`);
  const bookId = `${workspaceId}-handbook`;
  const articleId = `${workspaceId}-welcome`;
  const chapterId = `${bookId}--getting-started`;
  const book = withWorkspacePublicationMeta(
    {
      ...parseMarkdown(
        `# Team Handbook

This book groups the pages your visitors need when they first land on the site.
`,
        { documentId: bookId },
      ),
      title: 'Team Handbook',
      meta: {
        updatedAt: now,
      },
    },
    {
      kind: 'book',
      slug: 'team-handbook',
      summary: 'Core guides for your product, team, or documentation site.',
      published: true,
      topics: ['docs', 'guide'],
      emoji: '📘',
    },
  );
  const chapter = withWorkspacePublicationMeta(
    {
      ...parseMarkdown(
        `# はじめに

最初に読む人向けに、この章で最短の導線を案内します。

- どんな課題を解くのかを書く
- 最初の作業を一つ見せる
- 詳しい説明への導線を置く
`,
        { documentId: chapterId },
      ),
      title: 'はじめに',
      meta: {
        updatedAt: now,
      },
    },
    {
      kind: 'chapter',
      slug: 'getting-started',
      summary: '初めて読む人向けの入口です。',
      published: true,
      topics: ['onboarding'],
      bookId,
      chapterOrder: 1,
      emoji: '🚀',
    },
  );
  const article = withWorkspacePublicationMeta(
    {
      ...parseMarkdown(
        `# 今回の更新

article は更新、変更履歴、短いお知らせを書く場所として使います。
`,
        { documentId: articleId },
      ),
      title: '今回の更新',
      meta: {
        updatedAt: now,
      },
    },
    {
      kind: 'article',
      slug: 'what-we-ship',
      summary: 'site や product の最新更新をまとめます。',
      published: true,
      topics: ['updates'],
      emoji: '📝',
    },
  );
  const documents = [article, book, chapter];
  return {
    manifest: {
      id: workspaceId,
      name: options.name?.trim() || 'ドキュメントサイト',
      createdAt: now,
      updatedAt: now,
      documentOrder: documents.map((doc) => doc.id),
    },
    site: {
      title: options.name?.trim() || 'ドキュメントサイト',
      tagline: 'Papyr を使って browser の中だけで組み立てます',
      homeIntro:
        '最初に見せたい page から順に下書きし、そのまま preview と publish まで一つの workspace で進めます。',
      logoEmoji: '🧱',
    },
    documents,
  };
}

export function validateWorkspace(workspace: WorkspaceState): WorkspaceValidationResult {
  const issues: string[] = [];
  const docIds = new Set<string>();
  const books = new Set<string>();
  const slugKeys = new Set<string>();

  for (const document of workspace.documents) {
    try {
      parseDocument(document);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `document ${document.id} is invalid`);
      continue;
    }
    if (docIds.has(document.id)) issues.push(`duplicate document id: ${document.id}`);
    docIds.add(document.id);

    const publication = getWorkspacePublicationMeta(document);
    if (!publication) {
      issues.push(`document ${document.id} is missing meta.publication`);
      continue;
    }
    const slugKey = `${publication.kind}:${publication.slug}`;
    if (slugKeys.has(slugKey)) issues.push(`duplicate publication slug: ${slugKey}`);
    slugKeys.add(slugKey);

    if (publication.kind === 'book') books.add(document.id);
  }

  for (const document of workspace.documents) {
    const publication = getWorkspacePublicationMeta(document);
    if (!publication || publication.kind !== 'chapter') continue;
    if (!books.has(publication.bookId)) {
      issues.push(`chapter ${document.id} references missing book ${publication.bookId}`);
    }
  }

  const orderIds = new Set(workspace.manifest.documentOrder);
  for (const id of workspace.manifest.documentOrder) {
    if (!docIds.has(id)) issues.push(`manifest references missing document ${id}`);
  }
  for (const id of docIds) {
    if (!orderIds.has(id)) issues.push(`manifest is missing document ${id}`);
  }
  if (!workspace.site.title.trim()) issues.push('site title is required');
  if (!workspace.manifest.name.trim()) issues.push('workspace name is required');
  if (!workspace.manifest.id.trim()) issues.push('workspace id is required');

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeWorkspaceBundle(workspace: WorkspaceState): WorkspaceExportBundle {
  const validation = validateWorkspace(workspace);
  if (!validation.valid) {
    throw new Error(`workspace validation failed:\n${validation.issues.join('\n')}`);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    manifest: {
      ...workspace.manifest,
      documentOrder: [...workspace.manifest.documentOrder],
    },
    site: { ...workspace.site },
    documents: workspace.documents.map((doc) => parseDocument(doc)),
    ...(workspace.publishTarget
      ? {
          publishTarget: {
            endpoint: workspace.publishTarget.endpoint,
            workspaceId: workspace.publishTarget.workspaceId,
          },
        }
      : {}),
  };
}

export function parseWorkspaceBundle(input: unknown): WorkspaceExportBundle {
  if (!isObject(input)) throw new Error('workspace bundle must be an object');
  if (input.version !== 1) throw new Error('workspace bundle version must be 1');
  if (typeof input.exportedAt !== 'string')
    throw new Error('workspace bundle exportedAt is required');
  if (!isObject(input.manifest)) throw new Error('workspace bundle manifest is required');
  if (!isObject(input.site)) throw new Error('workspace bundle site is required');
  if (!Array.isArray(input.documents))
    throw new Error('workspace bundle documents must be an array');

  const manifest: WorkspaceManifest = {
    id: normalizeRequiredText(input.manifest.id, 'workspace manifest id'),
    name: normalizeRequiredText(input.manifest.name, 'workspace manifest name'),
    createdAt: normalizeRequiredText(input.manifest.createdAt, 'workspace manifest createdAt'),
    updatedAt: normalizeRequiredText(input.manifest.updatedAt, 'workspace manifest updatedAt'),
    documentOrder: input.manifest.documentOrder
      ? normalizeTextArray(input.manifest.documentOrder, 'workspace manifest documentOrder')
      : [],
  };
  const site: WorkspaceSiteConfig = {
    title: normalizeRequiredText(input.site.title, 'workspace site title'),
    tagline: normalizeText(input.site.tagline),
    homeIntro: normalizeText(input.site.homeIntro),
    ...(normalizeText(input.site.logoEmoji)
      ? { logoEmoji: normalizeText(input.site.logoEmoji) }
      : {}),
  };
  const documents = input.documents.map((document) => parseDocument(document));

  const bundle: WorkspaceExportBundle = {
    version: 1,
    exportedAt: input.exportedAt,
    manifest: {
      ...manifest,
      documentOrder:
        manifest.documentOrder.length > 0 ? manifest.documentOrder : documents.map((doc) => doc.id),
    },
    site,
    documents,
    ...(isObject(input.publishTarget)
      ? {
          publishTarget: {
            endpoint: normalizeRequiredText(
              input.publishTarget.endpoint,
              'publish target endpoint',
            ),
            workspaceId: normalizeRequiredText(
              input.publishTarget.workspaceId,
              'publish target workspace id',
            ),
          },
        }
      : {}),
  };

  const validation = validateWorkspace({
    manifest: bundle.manifest,
    site: bundle.site,
    documents: bundle.documents,
  });
  if (!validation.valid) {
    throw new Error(`workspace validation failed:\n${validation.issues.join('\n')}`);
  }
  return bundle;
}

export function buildWorkspaceSearchIndexInput(
  workspace: WorkspaceState,
): WorkspaceSearchIndexInput {
  return {
    site: { ...workspace.site },
    documents: workspace.documents.map((doc) => parseDocument(doc)),
  };
}

export function getWorkspacePublicationMeta(doc: PapyrDocument): WorkspacePublicationMeta | null {
  return parseWorkspacePublicationMeta(doc.meta?.publication);
}

export function parseWorkspacePublicationMeta(value: unknown): WorkspacePublicationMeta | null {
  if (!isObject(value)) return null;
  const kind = value.kind;
  if (!isWorkspacePublicationKind(kind)) return null;
  const slug = normalizeText(value.slug);
  const summary = normalizeText(value.summary);
  if (!slug || typeof value.published !== 'boolean') return null;

  const base = {
    kind,
    slug,
    summary,
    published: value.published,
    topics: normalizeTopics(value.topics),
    ...(normalizeText(value.emoji) ? { emoji: normalizeText(value.emoji) } : {}),
  };

  if (kind === 'chapter') {
    const bookId = normalizeText(value.bookId);
    const chapterOrder = typeof value.chapterOrder === 'number' ? value.chapterOrder : 0;
    if (!bookId || !Number.isInteger(chapterOrder) || chapterOrder < 1) return null;
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

export function withWorkspacePublicationMeta(
  doc: PapyrDocument,
  publication: WorkspacePublicationMeta,
): PapyrDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      publication,
    },
  };
}

export function isWorkspacePublicationKind(value: unknown): value is WorkspacePublicationKind {
  return value === 'article' || value === 'book' || value === 'chapter';
}

export function deriveWorkspaceDocumentTitle(doc: PapyrDocument): string {
  const explicit = doc.title?.trim();
  if (explicit) return explicit;
  const heading = doc.blocks.find(
    (block): block is HeadingBlock => isBlockKind(block, 'Heading'),
  );
  const headingText = heading?.[1].content
    .map((part) => part.text)
    .join('')
    .trim();
  return headingText || doc.id;
}

export function listWorkspacePublicationSummaries(
  documents: PapyrDocument[],
): WorkspacePublicationSummary[] {
  return documents
    .map((doc) => {
      const publication = getWorkspacePublicationMeta(doc);
      if (!publication) return null;
      return {
        id: doc.id,
        title: deriveWorkspaceDocumentTitle(doc),
        kind: publication.kind,
        slug: publication.slug,
        summary: publication.summary,
        published: publication.published,
        topics: publication.topics,
        ...(publication.emoji ? { emoji: publication.emoji } : {}),
        ...(typeof doc.meta?.updatedAt === 'string' ? { updatedAt: doc.meta.updatedAt } : {}),
        ...('bookId' in publication ? { bookId: publication.bookId } : {}),
        ...('chapterOrder' in publication ? { chapterOrder: publication.chapterOrder } : {}),
      };
    })
    .filter((summary): summary is WorkspacePublicationSummary => summary !== null)
    .sort((left, right) => {
      if (left.kind === 'chapter' && right.kind === 'chapter') {
        return (
          (left.chapterOrder ?? 0) - (right.chapterOrder ?? 0) ||
          left.title.localeCompare(right.title)
        );
      }
      return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
    });
}

export function findWorkspacePublicationBySlug(
  summaries: WorkspacePublicationSummary[],
  kind: 'article' | 'book',
  slug: string,
): WorkspacePublicationSummary | null {
  return summaries.find((summary) => summary.kind === kind && summary.slug === slug) ?? null;
}

export function findWorkspaceChapterBySlugs(
  summaries: WorkspacePublicationSummary[],
  bookSlug: string,
  chapterSlug: string,
): {
  book: WorkspacePublicationSummary & { kind: 'book' };
  chapter: WorkspacePublicationSummary & { kind: 'chapter' };
} | null {
  const book =
    summaries.find(
      (summary): summary is WorkspacePublicationSummary & { kind: 'book' } =>
        summary.kind === 'book' && summary.slug === bookSlug,
    ) ?? null;
  if (!book) return null;
  const chapter =
    summaries.find(
      (summary): summary is WorkspacePublicationSummary & { kind: 'chapter' } =>
        summary.kind === 'chapter' && summary.bookId === book.id && summary.slug === chapterSlug,
    ) ?? null;
  if (!chapter) return null;
  return { book, chapter };
}

export function buildWorkspaceBookPayload(
  bookId: string,
  documents: PapyrDocument[],
): WorkspaceBookPayload | null {
  const book = documents.find((doc) => doc.id === bookId) ?? null;
  if (!book) return null;
  const bookMeta = getWorkspacePublicationMeta(book);
  if (bookMeta?.kind !== 'book') return null;
  const chapters = documents
    .filter((doc) => {
      const publication = getWorkspacePublicationMeta(doc);
      return publication?.kind === 'chapter' && publication.bookId === bookId;
    })
    .sort((left, right) => {
      const leftMeta = getWorkspacePublicationMeta(left);
      const rightMeta = getWorkspacePublicationMeta(right);
      return (
        (leftMeta?.kind === 'chapter' ? leftMeta.chapterOrder : Number.MAX_SAFE_INTEGER) -
          (rightMeta?.kind === 'chapter' ? rightMeta.chapterOrder : Number.MAX_SAFE_INTEGER) ||
        deriveWorkspaceDocumentTitle(left).localeCompare(deriveWorkspaceDocumentTitle(right))
      );
    });
  return { book, chapters };
}

export function workspaceToState(bundle: WorkspaceExportBundle): WorkspaceState {
  return {
    manifest: {
      ...bundle.manifest,
      documentOrder: [...bundle.manifest.documentOrder],
    },
    site: { ...bundle.site },
    documents: bundle.documents.map((doc) => parseDocument(doc)),
    ...(bundle.publishTarget ? { publishTarget: { ...bundle.publishTarget } } : {}),
  };
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = normalizeText(value);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function normalizeTextArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((item) => normalizeRequiredText(item, label));
}

function normalizeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const item of value) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    topics.push(normalized);
  }
  return topics;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createWorkspaceToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
