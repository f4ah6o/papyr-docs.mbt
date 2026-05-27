import { expect, test } from '@playwright/test';

test('/articles から記事詳細を開ける', async ({ page }) => {
  await page.goto('/articles');
  await expect(
    page.getByRole('heading', { level: 1, name: 'リリースノート / ブログ' }),
  ).toBeVisible();

  const articleLink = page.locator('.publication-list__item a').first();
  await expect(articleLink).toBeVisible();
  await articleLink.click();

  await expect(page).toHaveURL(/\/articles\/[^/]+$/);
  await expect(page.locator('.article-page > .article-header h1')).toBeVisible();
  await expect(page.locator('.preview-surface')).toBeVisible();
  const nav = page.locator('.site-nav');
  await expect(nav.getByRole('link', { name: 'ホーム' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Docs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Updates' })).toHaveClass(/active/);
});

test('/articles/<slug>.md は raw markdown を返す', async ({ request }) => {
  const response = await request.get('/articles/introducing-papyr-docs.md');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/markdown');
  expect(await response.text()).toContain('kind: article');
});

test('article slide view syncs keyboard navigation with the url', async ({ page }) => {
  await page.goto('/articles/introducing-papyr-docs?view=slides');

  const viewer = page.locator('[data-slide-viewer]');
  const frame = page.locator('[data-slide-frame]');
  await expect(viewer).toBeVisible();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '1');

  await page.keyboard.press('ArrowRight');
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '2');
  await expect(page).toHaveURL(/view=slides.*slide=2/);

  await page.keyboard.press('End');
  await expect(viewer).toHaveAttribute('data-slide-index', '3');
  await expect(page).toHaveURL(/view=slides.*slide=3/);

  await page.keyboard.press('Home');
  await expect(viewer).toHaveAttribute('data-slide-index', '1');
  await expect(page).toHaveURL(/view=slides.*slide=1/);

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('/articles/introducing-papyr-docs');
  await expect(page.locator('.article-page')).toBeVisible();
});

test('article slide view syncs viewport selector to the url', async ({ page }) => {
  await page.goto('/articles/introducing-papyr-docs?view=slides');

  const frame = page.locator('[data-slide-frame]');
  const viewport = page.getByRole('combobox', { name: 'Viewport' });
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewport).toHaveValue('1280x720');

  await viewport.selectOption('1600x900');
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewport).toHaveValue('1600x900');
  await expect(page).toHaveURL(/view=slides.*viewport=1600x900/);
});

test('article slide view toggles fullscreen without losing slide state', async ({ page }) => {
  await page.goto('/articles/introducing-papyr-docs?view=slides');

  const viewer = page.locator('[data-slide-viewer]');
  const frame = page.locator('[data-slide-frame]');
  const fullscreenButton = page.locator('#slide-fullscreen');

  await expect(viewer).toBeVisible();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(fullscreenButton).toBeVisible();
  await expect(fullscreenButton).toHaveText('全画面表示');

  await fullscreenButton.click();
  await expect(viewer).toHaveAttribute('data-fullscreen', 'true');
  await expect(fullscreenButton).toHaveText('全画面終了');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBeTruthy();

  await page.getByRole('button', { name: '次へ' }).click();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '2');
  await expect(page).toHaveURL(/view=slides.*slide=2/);

  await fullscreenButton.click();
  await expect(viewer).toHaveAttribute('data-fullscreen', 'false');
  await expect(fullscreenButton).toHaveText('全画面表示');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBeFalsy();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
});
