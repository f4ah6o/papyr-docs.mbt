import { expect, test } from '@playwright/test';

test('advanced playground が OPFS workspace と local preview を表示する', async ({ page }) => {
  await page.goto('/playground/advanced');

  await expect(
    page.getByRole('heading', { name: 'browser 上で組み立てる docs site workspace' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OPFS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '共通 docs chrome' })).toBeVisible();
  await expect(
    page.getByTestId('advanced-playground-preview-site-title'),
  ).toBeVisible();
  await expect(page.getByTestId('advanced-playground-preview-site-title')).toHaveText(
    '来訪者向け docs site',
  );
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await expect(page.locator('.advanced-playground__preview-frame')).toContainText(
    'Papyr を使って browser の中だけで組み立てます',
  );
});

test('advanced playground で article を追加して reload 後も残る', async ({ page }) => {
  const title = `Playwright Article ${Date.now()}`;

  await page.goto('/playground/advanced');
  await page.getByRole('button', { name: '新しい article' }).click();
  await page.locator('.advanced-playground__main').getByLabel('Title').fill(title);
  await expect(page.locator('.advanced-playground__status-pill')).toHaveText('OPFS に保存しました。', {
    timeout: 10_000,
  });

  await page.reload();

  await expect(page.getByRole('button', { name: title })).toBeVisible();
});
