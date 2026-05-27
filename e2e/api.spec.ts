import { expect, test } from '@playwright/test';

test('GET /api/publications が items を返す', async ({ request }) => {
  const response = await request.get('/api/publications?published=true');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toContain('max-age=300');

  const body = (await response.json()) as {
    items: Array<{ id: string; kind: string; title: string; slug: string }>;
  };
  expect(Array.isArray(body.items)).toBe(true);
  expect(body.items.length).toBeGreaterThan(0);
  for (const item of body.items) {
    expect(['article', 'book', 'chapter']).toContain(item.kind);
  }
});

test('GET /api/publications/:id が publication JSON を返す', async ({ request }) => {
  const list = await request.get('/api/publications?published=true');
  const body = (await list.json()) as {
    items: Array<{ id: string; title: string; kind: string; slug: string }>;
  };
  const first = body.items[0];
  expect(first).toBeTruthy();

  const response = await request.get(`/api/publications/${encodeURIComponent(first!.id)}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toContain('max-age=300');

  const publication = (await response.json()) as { id: string; blocks: unknown[] };
  expect(publication.id).toBe(first!.id);
  expect(Array.isArray(publication.blocks)).toBe(true);
});

test('GET /api/books/:id が book payload を返す', async ({ request }) => {
  const list = await request.get('/api/publications?kind=book&published=true');
  const body = (await list.json()) as {
    items: Array<{ id: string; kind: string; title: string; slug: string }>;
  };
  const first = body.items[0];
  expect(first).toBeTruthy();

  const response = await request.get(`/api/books/${encodeURIComponent(first!.id)}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toContain('max-age=300');

  const book = (await response.json()) as {
    book: { id: string };
    chapters: Array<{ id: string }>;
  };
  expect(book.book.id).toBe(first!.id);
  expect(Array.isArray(book.chapters)).toBe(true);
});

test('GET /api/publications は kind query を検証する', async ({ request }) => {
  const response = await request.get('/api/publications?kind=invalid');
  expect(response.status()).toBe(400);
});

test('GET /robots.txt は sitemap を指す', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(response.headers()['cache-control']).toContain('max-age=86400');
  const body = await response.text();
  expect(body).toContain('Sitemap: ');
  expect(body).toContain('/sitemap.xml');
});

test('GET /llms.txt は published docs の raw markdown URL を含む', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(response.headers()['cache-control']).toContain('max-age=3600');
  const body = await response.text();
  expect(body).toContain('# Papyr Docs');
  expect(body).toContain('/articles/');
  expect(body).toContain('/books/');
  expect(body).toContain('.md');
});

test('GET /sitemap.xml は published html routes を返す', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/xml');
  expect(response.headers()['cache-control']).toContain('max-age=3600');
  const body = await response.text();
  expect(body).toContain('<urlset');
  expect(body).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
  expect(body).toContain('/articles/');
  expect(body).toContain('/books/');
});

test('raw markdown routes return markdown bodies', async ({ request }) => {
  const article = await request.get('/articles/introducing-papyr-docs.md');
  expect(article.status()).toBe(200);
  expect(article.headers()['content-type']).toContain('text/markdown');
  expect(article.headers()['cache-control']).toContain('max-age=3600');

  const chapter = await request.get('/books/getting-started/install.md');
  expect(chapter.status()).toBe(200);
  expect(chapter.headers()['content-type']).toContain('text/markdown');
  expect(chapter.headers()['cache-control']).toContain('max-age=3600');
});

test('未知の API ルートは 404', async ({ request }) => {
  const response = await request.get('/api/__nope__');
  expect(response.status()).toBe(404);
});
