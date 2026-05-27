import { expect, test } from '@playwright/test';

test('/use-cases から Papyr docs use case に遷移できる', async ({ page }) => {
  await page.goto('/use-cases');

  await page.getByRole('link', { name: /Papyr の公式 docs site/ }).click();

  await expect(page).toHaveURL(/\/books\/papyr-docs$/);
  await expect(
    page.locator('#book-preview').getByRole('heading', { level: 1, name: 'Papyr の公式 docs site' }),
  ).toBeVisible();
  await expect(page.locator('#book-preview')).toContainText('articles と use-cases の違い');
});

test('use-case book から既存 docs へ内部遷移できる', async ({ page }) => {
  await page.goto('/books/papyr-docs');

  await expect(page.getByRole('link', { name: 'Getting Started を読む' })).toBeVisible();
  await expect(page.getByRole('link', { name: '@f12o/papyr-core を見る' })).toBeVisible();
  await expect(page.getByRole('link', { name: '@f12o/papyr-markdown を見る' })).toBeVisible();
  await expect(page.getByRole('link', { name: '@f12o/papyr-preview を見る' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Playground を開く' })).toBeVisible();

  await page.getByRole('link', { name: 'Getting Started を読む' }).click();
  await expect(page).toHaveURL(/\/books\/getting-started$/);
});

test('use-case book から chapter を開ける', async ({ page }) => {
  await page.goto('/books/papyr-docs');

  await page.getByRole('link', { name: 'この site の構成を見る' }).click();

  await expect(page).toHaveURL(/\/books\/papyr-docs\/how-this-site-works$/);
  await expect(
    page.locator('#chapter-preview').getByRole('heading', { level: 1, name: 'この site の構成' }),
  ).toBeVisible();
});

test('/use-cases に追加した package-backed use case が並ぶ', async ({ page }) => {
  await page.goto('/use-cases');

  await expect(page.locator('main')).toContainText('ローカル Markdown 運用から Papyr 編集体験へ');
  await expect(page.locator('main')).toContainText('Markdown リポジトリを Papyr docs pipeline に載せる');
  await expect(page.locator('main')).toContainText('Cloudflare で Papyr の公開サイトを組み立てる');
});

test('新しい use-case book から chapter を開ける', async ({ page }) => {
  await page.goto('/books/local-authoring-workflow');

  await page.getByRole('link', { name: 'VS Code と integrated editor の流れを見る' }).click();

  await expect(page).toHaveURL(/\/books\/local-authoring-workflow\/vscode-and-editor-flow$/);
  await expect(
    page
      .locator('#chapter-preview')
      .getByRole('heading', { level: 1, name: 'VS Code と integrated editor の流れ' }),
  ).toBeVisible();
});
