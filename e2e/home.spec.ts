import { expect, test } from '@playwright/test';

test('home が public-facing hero と landing sections を表示する', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Papyr は、Markdown から育てるドキュメントサイトの土台です。',
    }),
  ).toBeVisible();

  const nav = page.locator('.site-nav');
  await expect(nav.getByRole('link', { name: 'Use Cases' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Docs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Updates' })).toBeVisible();
  await expect(nav.getByRole('link', { name: '試してみる' })).toBeVisible();

  await expect(page.getByRole('link', { name: '導入ガイドを見る' }).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: '実例から読む' }),
  ).toBeVisible();
  await expect(page.locator('#use-cases')).toContainText('Advanced Playground');
  await expect(page.locator('#use-cases')).toContainText('Papyr の公式 docs site');
  await expect(page.locator('#use-cases')).toContainText('Markdown リポジトリを Papyr docs pipeline に載せる');
  await expect(page.locator('#use-cases')).toContainText('Cloudflare で Papyr の公開サイトを組み立てる');
  await expect(page.getByRole('link', { name: /Cloudflare で Papyr の公開サイトを組み立てる/ })).toBeVisible();
});

test('landing nav から in-page section に移動できる', async ({ page }) => {
  await page.goto('/');

  const nav = page.locator('.site-nav');
  const useCasesLink = nav.getByRole('link', { name: 'Use Cases' });
  await useCasesLink.click();

  await expect(page).toHaveURL(/\/use-cases$/);
  await expect(useCasesLink).toHaveClass(/active/);
  await expect(page.getByRole('heading', { level: 1, name: '実例から Papyr の使い方を辿る' })).toBeVisible();
});

test('検索フォームから /search?q=... に遷移する', async ({ page }) => {
  await page.goto('/');

  const input = page.locator('#site-search-form input[name="q"]');
  await input.fill('papyr');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=papyr$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('papyr');
});
