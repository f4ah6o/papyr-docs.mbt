import { describe, expect, it, vi } from 'vitest';
import { createDocsWebMcpTools } from './docs-webmcp.js';

describe('createDocsWebMcpTools', () => {
  const context = {
    listPublications: vi.fn(async () => [
      {
        id: 'article-launch',
        title: 'Launch',
        kind: 'article' as const,
        section: 'article' as const,
        summary: 'release note',
        published: true,
        slug: 'launch',
        topics: ['release'],
        href: '/articles/launch',
      },
    ]),
    readMarkdown: vi.fn(async (path: string) => ({ path, markdown: '# Launch' })),
    search: vi.fn(async () => [
      {
        id: 'article-launch',
        title: 'Launch',
        href: '/articles/launch',
        kind: 'article' as const,
        section: 'article' as const,
        snippet: 'release',
      },
    ]),
    navigate: vi.fn(),
    getCurrentPage: vi.fn(() => ({
      path: '/articles/launch',
      title: 'Launch',
      routeName: 'article',
    })),
  };

  const client = {
    requestUserInteraction(callback: () => void) {
      callback();
    },
  };

  it('lists publications with filters', async () => {
    const tool = createDocsWebMcpTools(context).find((item) => item.name === 'docs-list-publications');
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ kind: 'article', published: true }, client);
    expect(result).toEqual([
      {
        id: 'article-launch',
        title: 'Launch',
        kind: 'article',
        section: 'article',
        summary: 'release note',
        published: true,
        slug: 'launch',
        topics: ['release'],
        href: '/articles/launch',
      },
    ]);
    expect(context.listPublications).toHaveBeenCalledWith({
      kind: 'article',
      section: undefined,
      published: true,
    });
  });

  it('reads markdown from the requested path', async () => {
    const tool = createDocsWebMcpTools(context).find((item) => item.name === 'docs-read-markdown');
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ path: '/articles/launch' }, client);
    expect(result).toEqual({ path: '/articles/launch', markdown: '# Launch' });
    expect(context.readMarkdown).toHaveBeenCalledWith('/articles/launch');
  });

  it('navigates through requestUserInteraction', async () => {
    const tool = createDocsWebMcpTools(context).find((item) => item.name === 'docs-navigate');
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ path: '/search?q=papyr' }, client);
    expect(result).toEqual({
      path: '/search?q=papyr',
      message: 'Navigated to /search?q=papyr',
    });
    expect(context.navigate).toHaveBeenCalledWith('/search?q=papyr');
  });
});
