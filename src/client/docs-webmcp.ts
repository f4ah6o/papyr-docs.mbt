import type { PublicationKind, PublicationSection } from '../shared.js';
import {
  registerModelContextTools,
  runWithUserInteraction,
  type ModelContextTool,
} from './webmcp.js';

export interface DocsPublicationRecord {
  id: string;
  title: string;
  kind: PublicationKind;
  section: PublicationSection;
  summary: string;
  published: boolean;
  slug: string;
  topics: string[];
  href: string;
  bookId?: string;
  chapterOrder?: number;
}

export interface DocsSearchResult {
  id: string;
  title: string;
  href: string;
  kind: PublicationKind;
  section: PublicationSection;
  snippet: string;
}

export interface DocsPageContext {
  path: string;
  title: string;
  routeName: string;
}

export interface DocsWebMcpContext {
  listPublications(filters?: {
    kind?: PublicationKind;
    section?: PublicationSection;
    published?: boolean;
  }): Promise<DocsPublicationRecord[]>;
  readMarkdown(path: string): Promise<{ path: string; markdown: string }>;
  search(query: string, options?: {
    section?: PublicationSection | 'all';
    limit?: number;
  }): Promise<DocsSearchResult[]>;
  navigate(path: string): void;
  getCurrentPage(): DocsPageContext;
}

export function createDocsWebMcpTools(context: DocsWebMcpContext): ModelContextTool[] {
  return [
    {
      name: 'docs-list-publications',
      title: 'List Papyr Docs publications',
      description:
        'Lists Papyr docs articles, books, and chapters with summaries, sections, topics, and hrefs.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['article', 'book', 'chapter'],
          },
          section: {
            type: 'string',
            enum: ['getting-started', 'use-case', 'package', 'article'],
          },
          published: {
            type: 'boolean',
          },
        },
      },
      execute: async (input) =>
        context.listPublications({
          kind: asPublicationKind(input.kind),
          section: asPublicationSection(input.section),
          published: typeof input.published === 'boolean' ? input.published : undefined,
        }),
      annotations: { readOnlyHint: true },
    },
    {
      name: 'docs-read-markdown',
      title: 'Read Papyr Docs markdown',
      description:
        'Reads the raw markdown for a Papyr docs publication page. Pass the publication path such as /articles/foo or /books/bar/baz.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Publication path or markdown path within the docs site.',
          },
        },
        required: ['path'],
      },
      execute: async (input) => {
        const path = expectString(input.path, 'path');
        return context.readMarkdown(path);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'docs-search',
      title: 'Search Papyr Docs',
      description:
        'Searches published Papyr docs content and returns matching pages with snippets and hrefs.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text search query.',
          },
          section: {
            type: 'string',
            enum: ['all', 'getting-started', 'use-case', 'package', 'article'],
            default: 'all',
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
        return context.search(query, {
          section: asSearchSection(input.section),
          limit,
        });
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'docs-navigate',
      title: 'Navigate Papyr Docs',
      description:
        'Navigates the current Papyr docs page to a new internal path such as /articles/foo or /search?q=markdown.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Internal docs path to open.',
          },
        },
        required: ['path'],
      },
      execute: async (input, client) => {
        const path = expectString(input.path, 'path');
        await runWithUserInteraction(client, () => context.navigate(path));
        return { path, message: `Navigated to ${path}` };
      },
    },
    {
      name: 'docs-get-current-page',
      title: 'Get Papyr Docs page context',
      description:
        'Returns the current Papyr docs page path, route name, and document title for the active tab.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => context.getCurrentPage(),
      annotations: { readOnlyHint: true },
    },
  ];
}

export function registerDocsWebMcp(context: DocsWebMcpContext): () => void {
  return registerModelContextTools(createDocsWebMcpTools(context));
}

function expectString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`${field} is required`);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function asPublicationKind(value: unknown): PublicationKind | undefined {
  return value === 'article' || value === 'book' || value === 'chapter' ? value : undefined;
}

function asPublicationSection(value: unknown): PublicationSection | undefined {
  return value === 'getting-started' ||
    value === 'use-case' ||
    value === 'package' ||
    value === 'article'
    ? value
    : undefined;
}

function asSearchSection(value: unknown): PublicationSection | 'all' {
  return value === 'all' ? 'all' : (asPublicationSection(value) ?? 'all');
}
