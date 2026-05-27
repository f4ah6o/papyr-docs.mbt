import { expect, test } from '@playwright/test';

test('/playground が統合 editor workspace を表示する', async ({ page }) => {
  await page.goto('/playground');

  await expect(page.locator('#playground-root')).toBeVisible();
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await expect(page.locator('.editor-workspace__prosemirror')).toBeVisible();
  await expect(page.locator('.editor-workspace__toolbar')).toContainText('Bold');
  await expect(page.locator('.editor-workspace__summary-strip')).toContainText(
    'Visual blocks',
  );
});

test('/vscode-editor は削除され not found になる', async ({ page }) => {
  await page.goto('/vscode-editor');

  await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
  await expect(page.locator('.site-nav')).not.toContainText('VS Code editor');
});
