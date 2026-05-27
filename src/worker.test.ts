import { describe, expect, it } from 'vitest';
import { handleRequest, type Env } from './worker.js';

function createEnv(
  objects: Record<string, unknown>,
  options: { contentSource?: 'assets' | 'r2' } = {},
): Env {
  const assetObjects = Object.fromEntries(
    Object.entries(objects).map(([key, value]) => [toAssetPath(key), value] as const),
  );

  return {
    PAPYR_DOCS_R2: {
      async get(key: string) {
        if (!(key in objects)) return null;
        return {
          async text() {
            const value = objects[key];
            return typeof value === 'string' ? value : JSON.stringify(value);
          },
        };
      },
    },
    ASSETS: {
      fetch: async (input) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input : input.url);
        const value = assetObjects[url.pathname];
        const isDataPath = url.pathname.startsWith('/__papyr_docs_data/');
        if (typeof value === 'undefined') {
          return new Response(isDataPath ? 'not found' : 'asset', {
            status: isDataPath ? 404 : 200,
          });
        }
        return new Response(typeof value === 'string' ? value : JSON.stringify(value), {
          status: 200,
        });
      },
    },
    PAPYR_DOCS_CONTENT_SOURCE: options.contentSource,
  };
}

function toAssetPath(key: string): string {
  return `/__papyr_docs_data/${key.replace(/^papyr-docs\//, '')}`;
}

function baseObjects() {
  const book = {
    id: 'book-core',
    title: '@f12o/papyr-core',
    blocks: [['Heading', { id: 'b1', level: 1, content: [{ text: '@f12o/papyr-core' }] }]],
    meta: {
      publication: {
        kind: 'book',
        section: 'package',
        slug: 'core',
        summary: 'core docs',
        published: true,
        topics: [],
      },
    },
  };
  const chapter = {
    id: 'chapter-core-intro',
    title: 'Intro',
    blocks: [['Paragraph', { id: 'b2', content: [{ text: 'hello' }] }]],
    meta: {
      publication: {
        kind: 'chapter',
        section: 'package',
        slug: 'intro',
        summary: 'intro chapter',
        published: true,
        topics: [],
        bookId: 'book-core',
        chapterOrder: 1,
      },
    },
  };
  const article = {
    id: 'article-launch',
    title: 'Launch',
    blocks: [['Paragraph', { id: 'b3', content: [{ text: 'launch' }] }]],
    meta: {
      publication: {
        kind: 'article',
        section: 'article',
        slug: 'launch',
        summary: 'launch article',
        published: true,
        topics: ['release'],
      },
    },
  };

  return {
    'papyr-docs/manifest.json': {
      version: 1,
      generatedAt: '2026-04-24T00:00:00.000Z',
      publications: [
        {
          id: article.id,
          title: article.title,
          kind: 'article',
          section: 'article',
          slug: 'launch',
          summary: 'launch article',
          published: true,
          topics: ['release'],
        },
        {
          id: book.id,
          title: book.title,
          kind: 'book',
          section: 'package',
          slug: 'core',
          summary: 'core docs',
          published: true,
          topics: [],
        },
        {
          id: chapter.id,
          title: chapter.title,
          kind: 'chapter',
          section: 'package',
          slug: 'intro',
          summary: 'intro chapter',
          published: true,
          topics: [],
          bookId: book.id,
          chapterOrder: 1,
        },
      ],
      books: {
        [book.id]: {
          chapterIds: [chapter.id],
        },
      },
    },
    [`papyr-docs/books/${book.id}.json`]: {
      book,
      chapters: [chapter],
    },
    [`papyr-docs/docs/${article.id}.json`]: article,
    [`papyr-docs/docs/${book.id}.json`]: book,
    [`papyr-docs/docs/${chapter.id}.json`]: chapter,
    [`papyr-docs/raw/${article.id}.md`]: '# Launch\n\nrelease note\n',
    [`papyr-docs/raw/${book.id}.md`]: '# @f12o/papyr-core\n\ncore docs\n',
    [`papyr-docs/raw/${chapter.id}.md`]: '# Intro\n\nhello\n',
    'papyr-docs/docs/stale.json': {
      id: 'stale',
      blocks: [],
      meta: {
        publication: {
          kind: 'article',
          section: 'article',
          slug: 'stale',
          summary: 'stale',
          published: true,
          topics: [],
        },
      },
    },
  };
}

function firstPublication(objects: ReturnType<typeof baseObjects>): {
  title: string;
  summary: string;
  updatedAt?: string;
} {
  return objects['papyr-docs/manifest.json'].publications[0] as {
    title: string;
    summary: string;
    updatedAt?: string;
  };
}

describe('handleRequest', () => {
  it('publications は manifest だけを返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications?published=true'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { items: Array<{ id: string }> };
    expect(payload.items.map((item) => item.id)).toEqual([
      'article-launch',
      'book-core',
      'chapter-core-intro',
    ]);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('publication id で per-document JSON を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications/article-launch'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string };
    expect(payload.id).toBe('article-launch');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('percent-encoded publication id を decode して per-document JSON を返す', async () => {
    const objects = baseObjects();
    objects['papyr-docs/manifest.json'] = {
      ...objects['papyr-docs/manifest.json'],
      publications: [
        {
          id: 'book-core/with space',
          title: 'Encoded Book',
          kind: 'book',
          section: 'package',
          slug: 'encoded-book',
          summary: 'encoded docs',
          published: true,
          topics: [],
        },
      ],
      books: {
        'book-core/with space': {
          chapterIds: [],
        },
      },
    };
    objects['papyr-docs/docs/book-core/with space.json'] = {
      id: 'book-core/with space',
      title: 'Encoded Book',
      blocks: [],
      meta: {
        publication: {
          kind: 'book',
          section: 'package',
          slug: 'encoded-book',
          summary: 'encoded docs',
          published: true,
          topics: [],
        },
      },
    };

    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications/book-core%2Fwith%20space'),
      createEnv(objects),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string };
    expect(payload.id).toBe('book-core/with space');
  });

  it('assets source でも manifest と per-document JSON を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications/article-launch'),
      createEnv(baseObjects(), { contentSource: 'assets' }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string };
    expect(payload.id).toBe('article-launch');
  });

  it('book id で chapterIds を解決する', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/books/book-core'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      book: { id: string };
      chapters: Array<{ id: string }>;
    };
    expect(payload.book.id).toBe('book-core');
    expect(payload.chapters.map((chapter) => chapter.id)).toEqual(['chapter-core-intro']);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('percent-encoded book id を decode して book payload を返す', async () => {
    const objects = baseObjects();
    objects['papyr-docs/manifest.json'] = {
      ...objects['papyr-docs/manifest.json'],
      publications: [
        {
          id: 'book-core/with space',
          title: 'Encoded Book',
          kind: 'book',
          section: 'package',
          slug: 'encoded-book',
          summary: 'encoded docs',
          published: true,
          topics: [],
        },
      ],
      books: {
        'book-core/with space': {
          chapterIds: [],
        },
      },
    };
    objects['papyr-docs/books/book-core/with space.json'] = {
      book: {
        id: 'book-core/with space',
        title: 'Encoded Book',
        blocks: [],
        meta: {
          publication: {
            kind: 'book',
            section: 'package',
            slug: 'encoded-book',
            summary: 'encoded docs',
            published: true,
            topics: [],
          },
        },
      },
      chapters: [],
    };
    objects['papyr-docs/docs/book-core/with space.json'] = {
      id: 'book-core/with space',
      title: 'Encoded Book',
      blocks: [],
      meta: {
        publication: {
          kind: 'book',
          section: 'package',
          slug: 'encoded-book',
          summary: 'encoded docs',
          published: true,
          topics: [],
        },
      },
    };

    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/books/book-core%2Fwith%20space'),
      createEnv(objects),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      book: { id: string };
      chapters: Array<{ id: string }>;
    };
    expect(payload.book.id).toBe('book-core/with space');
    expect(payload.chapters).toEqual([]);
  });

  it('article route に .md を付けると raw markdown を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch.md'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('# Launch\n\nrelease note\n');
  });

  it('chapter route に .md を付けると raw markdown を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/books/core/intro.md'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('# Intro\n\nhello\n');
  });

  it('book route に .md を付けると raw markdown を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/books/core.md'),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('# @f12o/papyr-core\n\ncore docs\n');
  });

  it('SEO 用 static files は asset body に cache header を付けて返す', async () => {
    const env = createEnv(baseObjects());

    const robots = await handleRequest(new Request('https://papyr.f12o.com/robots.txt'), env);
    expect(robots.status).toBe(200);
    expect(robots.headers.get('cache-control')).toBe('public, max-age=86400');

    const llms = await handleRequest(new Request('https://papyr.f12o.com/llms.txt'), env);
    expect(llms.status).toBe(200);
    expect(llms.headers.get('cache-control')).toBe('public, max-age=3600');

    const sitemap = await handleRequest(new Request('https://papyr.f12o.com/sitemap.xml'), env);
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('assets source でも raw markdown を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/books/core/intro.md'),
      createEnv(baseObjects(), { contentSource: 'assets' }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('# Intro\n\nhello\n');
  });

  it('LLM UA が article ページを踏むと .md に 302 リダイレクトする', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch', {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.0)' },
        redirect: 'manual',
      }),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://papyr.f12o.com/articles/launch.md');
  });

  it('LLM UA が chapter ページを踏むと .md に 302 リダイレクトする', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/books/core/intro', {
        headers: { 'user-agent': 'ClaudeBot/1.0' },
        redirect: 'manual',
      }),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://papyr.f12o.com/books/core/intro.md');
  });

  it('LLM UA + クエリ文字列はリダイレクト先にも引き継ぐ', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch?ref=foo', {
        headers: { 'user-agent': 'PerplexityBot/1.0' },
        redirect: 'manual',
      }),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://papyr.f12o.com/articles/launch.md?ref=foo',
    );
  });

  it('LLM UA でも .md URL はそのまま markdown を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch.md', {
        headers: { 'user-agent': 'GPTBot/1.0' },
      }),
      createEnv(baseObjects()),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
  });

  it('LLM UA でもトップ・一覧はリダイレクトしない', async () => {
    const objects = baseObjects();
    const top = await handleRequest(
      new Request('https://papyr.f12o.com/', {
        headers: { 'user-agent': 'GPTBot/1.0' },
        redirect: 'manual',
      }),
      createEnv(objects),
    );
    expect(top.status).toBe(200);

    const articlesIndex = await handleRequest(
      new Request('https://papyr.f12o.com/articles', {
        headers: { 'user-agent': 'GPTBot/1.0' },
        redirect: 'manual',
      }),
      createEnv(objects),
    );
    expect(articlesIndex.status).toBe(200);
  });

  it('LLM UA でも /api/* はリダイレクトしない', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications', {
        headers: { 'user-agent': 'GPTBot/1.0' },
      }),
      createEnv(baseObjects()),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('通常ブラウザ UA の article ページはリダイレクトせず SPA を返す', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch', {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'manual',
      }),
      createEnv(baseObjects()),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset');
  });

  it('manifest がないと 500', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications'),
      createEnv({}),
    );
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('raw markdown object が欠けた publication は 500', async () => {
    const objects = baseObjects();
    delete objects['papyr-docs/raw/article-launch.md'];

    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch.md'),
      createEnv(objects),
    );

    expect(response.status).toBe(500);
  });

  it('raw markdown route で manifest がないと text/plain の 500', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/articles/launch.md'),
      createEnv({}),
    );
    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  it('assets source で manifest がないと 500', async () => {
    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/publications'),
      createEnv({}, { contentSource: 'assets' }),
    );
    expect(response.status).toBe(500);
  });

  it('book payload object が欠けた book は 500', async () => {
    const objects = baseObjects();
    delete objects['papyr-docs/books/book-core.json'];

    const response = await handleRequest(
      new Request('https://papyr.f12o.com/api/books/book-core'),
      createEnv(objects),
    );
    expect(response.status).toBe(500);
  });

});
