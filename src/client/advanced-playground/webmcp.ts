import type { WorkspacePublicationKind } from '@f12o/papyr-workspace';
import {
  registerModelContextTools,
  runWithUserInteraction,
  type ModelContextTool,
} from '../webmcp.js';

type AdvancedPreviewRoute =
  | { name: 'home' }
  | { name: 'articles' }
  | { name: 'books' }
  | { name: 'article'; slug: string }
  | { name: 'book'; slug: string }
  | { name: 'chapter'; bookSlug: string; chapterSlug: string }
  | { name: 'search' };

interface AdvancedPlaygroundState {
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  previewRoute: AdvancedPreviewRoute;
  searchQuery: string;
  documentCount: number;
  publicationCount: number;
  publishConfigured: boolean;
  lastPublishedSiteUrl?: string;
}

interface AdvancedPlaygroundWorkspaceSummary {
  id: string;
  name: string;
  updatedAt: string;
}

interface AdvancedPlaygroundPublicationSummary {
  id: string;
  title: string;
  kind: WorkspacePublicationKind | 'chapter';
  slug: string;
  published: boolean;
  summary: string;
}

interface AdvancedPlaygroundSearchResult {
  id: string;
  title: string;
  kind: string;
  slug: string;
  score: number;
}

export interface AdvancedPlaygroundWebMcpContext {
  getState(): AdvancedPlaygroundState | null;
  listWorkspaces(): AdvancedPlaygroundWorkspaceSummary[];
  listPublications(): AdvancedPlaygroundPublicationSummary[];
  searchWorkspace(query: string, limit: number): AdvancedPlaygroundSearchResult[];
  createWorkspace(name?: string): Promise<{ id: string; name: string }>;
  openWorkspace(workspaceId: string): Promise<{ id: string; name: string }>;
  addDocument(kind: WorkspacePublicationKind): Promise<{ id: string; title: string; kind: WorkspacePublicationKind }>;
  navigatePreview(route: AdvancedPreviewRoute, options?: { query?: string }): void;
  publishWorkspace(): Promise<{
    siteUrl: string;
    updatedAt: string;
    publishedDocumentCount: number;
  }>;
}

export function createAdvancedPlaygroundWebMcpTools(
  getContext: () => AdvancedPlaygroundWebMcpContext | null,
): ModelContextTool[] {
  const readContext = (): AdvancedPlaygroundWebMcpContext => {
    const context = getContext();
    if (!context) throw new Error('Advanced Playground is not ready yet.');
    return context;
  };

  return [
    {
      name: 'advanced-playground-get-state',
      title: 'Get Advanced Playground state',
      description:
        'Returns the active Advanced Playground workspace, preview route, search query, and publish readiness.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const state = readContext().getState();
        if (!state) throw new Error('Advanced Playground state is unavailable.');
        return state;
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'advanced-playground-list-workspaces',
      title: 'List Advanced Playground workspaces',
      description: 'Lists the locally stored Advanced Playground workspaces available in OPFS.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => readContext().listWorkspaces(),
      annotations: { readOnlyHint: true },
    },
    {
      name: 'advanced-playground-list-publications',
      title: 'List Advanced Playground publications',
      description:
        'Lists the article, book, and chapter publications in the active Advanced Playground workspace.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => readContext().listPublications(),
      annotations: { readOnlyHint: true },
    },
    {
      name: 'advanced-playground-search',
      title: 'Search Advanced Playground content',
      description:
        'Searches the active Advanced Playground workspace without mutating the UI search state.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            default: 5,
          },
        },
        required: ['query'],
      },
      execute: async (input) => {
        const query = expectString(input.query, 'query');
        const limit = clampInteger(input.limit, 5, 1, 20);
        return readContext().searchWorkspace(query, limit);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'advanced-playground-create-workspace',
      title: 'Create Advanced Playground workspace',
      description: 'Creates a new Advanced Playground workspace and opens it.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      },
      execute: async (input, client) =>
        runWithUserInteraction(client, () => {
          const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : undefined;
          return readContext().createWorkspace(name);
        }),
    },
    {
      name: 'advanced-playground-open-workspace',
      title: 'Open Advanced Playground workspace',
      description: 'Opens an existing Advanced Playground workspace by id.',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
          },
        },
        required: ['workspaceId'],
      },
      execute: async (input, client) => {
        const workspaceId = expectString(input.workspaceId, 'workspaceId');
        return runWithUserInteraction(client, () => readContext().openWorkspace(workspaceId));
      },
    },
    {
      name: 'advanced-playground-add-document',
      title: 'Add Advanced Playground document',
      description: 'Adds a new article, book, or chapter document to the active workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['article', 'book', 'chapter'],
          },
        },
        required: ['kind'],
      },
      execute: async (input, client) => {
        const kind = asPublicationKind(input.kind);
        if (!kind) throw new Error('kind must be article, book, or chapter');
        return runWithUserInteraction(client, () => readContext().addDocument(kind));
      },
    },
    {
      name: 'advanced-playground-navigate-preview',
      title: 'Navigate Advanced Playground preview',
      description:
        'Changes the local preview route in Advanced Playground. Use route=search with query to open the search preview.',
      inputSchema: {
        type: 'object',
        properties: {
          route: {
            type: 'string',
            enum: ['home', 'articles', 'books', 'article', 'book', 'chapter', 'search'],
          },
          slug: {
            type: 'string',
          },
          bookSlug: {
            type: 'string',
          },
          chapterSlug: {
            type: 'string',
          },
          query: {
            type: 'string',
          },
        },
        required: ['route'],
      },
      execute: async (input, client) => {
        const route = resolvePreviewRoute(input);
        const query =
          typeof input.query === 'string' && input.query.trim() ? input.query.trim() : undefined;
        await runWithUserInteraction(client, () => readContext().navigatePreview(route, { query }));
        return {
          route,
          ...(query ? { query } : {}),
        };
      },
    },
    {
      name: 'advanced-playground-publish',
      title: 'Publish Advanced Playground workspace',
      description:
        'Publishes the active Advanced Playground workspace to its configured external endpoint.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async (_input, client) =>
        runWithUserInteraction(client, () => readContext().publishWorkspace()),
    },
  ];
}

export function registerAdvancedPlaygroundWebMcp(
  getContext: () => AdvancedPlaygroundWebMcpContext | null,
): () => void {
  return registerModelContextTools(createAdvancedPlaygroundWebMcpTools(getContext));
}

function expectString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`${field} is required`);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function asPublicationKind(value: unknown): WorkspacePublicationKind | null {
  return value === 'article' || value === 'book' || value === 'chapter' ? value : null;
}

function resolvePreviewRoute(input: Record<string, unknown>): AdvancedPreviewRoute {
  const route = expectString(input.route, 'route');
  switch (route) {
    case 'home':
    case 'articles':
    case 'books':
    case 'search':
      return { name: route };
    case 'article':
      return {
        name: 'article',
        slug: expectString(input.slug, 'slug'),
      };
    case 'book':
      return {
        name: 'book',
        slug: expectString(input.slug, 'slug'),
      };
    case 'chapter':
      return {
        name: 'chapter',
        bookSlug: expectString(input.bookSlug, 'bookSlug'),
        chapterSlug: expectString(input.chapterSlug, 'chapterSlug'),
      };
    default:
      throw new Error('route must be home, articles, books, article, book, chapter, or search');
  }
}
