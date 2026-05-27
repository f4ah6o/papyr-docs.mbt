import { describe, expect, it, vi } from 'vitest';
import { createAdvancedPlaygroundWebMcpTools } from './webmcp.js';

describe('createAdvancedPlaygroundWebMcpTools', () => {
  const context = {
    getState: vi.fn(() => ({
      activeWorkspaceId: 'workspace-1',
      activeWorkspaceName: '来訪者向け docs site',
      previewRoute: { name: 'home' as const },
      searchQuery: '',
      documentCount: 3,
      publicationCount: 3,
      publishConfigured: true,
    })),
    listWorkspaces: vi.fn(() => [
      { id: 'workspace-1', name: '来訪者向け docs site', updatedAt: '2026-05-05T00:00:00.000Z' },
    ]),
    listPublications: vi.fn(() => [
      {
        id: 'article-launch',
        title: 'Launch',
        kind: 'article' as const,
        slug: 'launch',
        published: true,
        summary: 'release note',
        section: 'article',
      },
    ]),
    searchWorkspace: vi.fn(() => [
      {
        id: 'article-launch',
        title: 'Launch',
        kind: 'article',
        slug: 'launch',
        score: 1,
      },
    ]),
    createWorkspace: vi.fn(async (name?: string) => ({
      id: 'workspace-2',
      name: name ?? '来訪者向け docs site 2',
    })),
    openWorkspace: vi.fn(async (workspaceId: string) => ({
      id: workspaceId,
      name: '来訪者向け docs site',
    })),
    addDocument: vi.fn(async (kind: 'article' | 'book' | 'chapter') => ({
      id: `${kind}-1`,
      title: `New ${kind}`,
      kind,
    })),
    navigatePreview: vi.fn(),
    publishWorkspace: vi.fn(async () => ({
      siteUrl: 'https://example.com',
      updatedAt: '2026-05-05T00:00:00.000Z',
      publishedDocumentCount: 3,
    })),
  };

  const client = {
    requestUserInteraction(callback: () => void) {
      callback();
    },
  };

  it('creates and opens a workspace via user interaction', async () => {
    const tool = createAdvancedPlaygroundWebMcpTools(() => context).find(
      (item) => item.name === 'advanced-playground-create-workspace',
    );
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ name: 'Agent workspace' }, client);
    expect(result).toEqual({ id: 'workspace-2', name: 'Agent workspace' });
    expect(context.createWorkspace).toHaveBeenCalledWith('Agent workspace');
  });

  it('navigates the preview using structured route input', async () => {
    const tool = createAdvancedPlaygroundWebMcpTools(() => context).find(
      (item) => item.name === 'advanced-playground-navigate-preview',
    );
    expect(tool).toBeTruthy();

    const result = await tool!.execute(
      { route: 'chapter', bookSlug: 'core', chapterSlug: 'intro' },
      client,
    );
    expect(result).toEqual({
      route: { name: 'chapter', bookSlug: 'core', chapterSlug: 'intro' },
    });
    expect(context.navigatePreview).toHaveBeenCalledWith(
      { name: 'chapter', bookSlug: 'core', chapterSlug: 'intro' },
      { query: undefined },
    );
  });

  it('searches the active workspace without mutating state', async () => {
    const tool = createAdvancedPlaygroundWebMcpTools(() => context).find(
      (item) => item.name === 'advanced-playground-search',
    );
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ query: 'launch', limit: 3 }, client);
    expect(result).toEqual([
      {
        id: 'article-launch',
        title: 'Launch',
        kind: 'article',
        slug: 'launch',
        score: 1,
      },
    ]);
    expect(context.searchWorkspace).toHaveBeenCalledWith('launch', 3);
  });
});
