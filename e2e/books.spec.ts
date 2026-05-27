import { expect, test } from '@playwright/test';

test('/books から book → chapter まで辿れる', async ({ page }) => {
  await page.goto('/books');
  await expect(
    page.getByRole('heading', { level: 1, name: '読む順番で辿る docs' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '最初に読む' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '実例の入口' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Use Cases 全 .* 件を見る/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '一覧を見る' })).toHaveAttribute('href', '/use-cases');
  const corePackagesSection = page.locator('.section').filter({
    has: page.getByRole('heading', { level: 2, name: '中心モデルと変換' }),
  });
  await expect(corePackagesSection.locator('.publication-card h3')).toHaveText([
    '@f12o/papyr-core',
    '@f12o/papyr-markdown',
    '@f12o/papyr-preview',
    '@f12o/papyr-search',
    '@f12o/papyr-backend',
  ]);
  const firstBook = page.locator('.publication-card a').first();
  await expect(page.getByRole('heading', { level: 2, name: 'Unclassified packages' })).toHaveCount(0);
  await expect(firstBook).toBeVisible();
  await firstBook.click();

  await expect(page).toHaveURL(/\/books\/[^/]+$/);
  await expect(page.locator('.book-sidebar h2')).toHaveText('目次');
  const nav = page.locator('.site-nav');
  await expect(nav.getByRole('link', { name: 'ホーム' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Updates' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Docs' })).toHaveClass(/active/);

  const firstChapter = page.locator('.book-sidebar .chapter-list a').first();
  await expect(firstChapter).toBeVisible();
  await firstChapter.click();

  await expect(page).toHaveURL(/\/books\/[^/]+\/[^/]+$/);
  await expect(page.locator('.reader-main > .article-header h1')).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Docs' })).toHaveClass(/active/);
});

test('/books/getting-started/install の生 markdown を返す', async ({ request }) => {
  const response = await request.get('/books/getting-started/install.md');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/markdown');
  const body = await response.text();
  expect(body).toContain('kind: chapter');
});
