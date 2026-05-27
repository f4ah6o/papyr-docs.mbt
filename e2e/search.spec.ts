import { expect, test } from '@playwright/test';

test('/search がヒット一覧を表示して詳細へ遷移できる', async ({ page }) => {
  await page.goto('/search?q=papyr');

  await expect(page.getByRole('heading', { level: 1, name: /papyr/ })).toBeVisible();

  const firstResult = page.locator('.search-list__item a').first();
  await expect(firstResult).toBeVisible();
  await expect(firstResult.getByRole('heading', { level: 3 })).toBeVisible();

  await firstResult.click();
  await expect(page).toHaveURL(/\/(articles|books)\//);
});

test('/search は section filter を切り替えられる', async ({ page }) => {
  await page.goto('/search?q=papyr');

  const useCasesFilter = page.locator('.search-filter-row').getByRole('link', { name: 'Use Cases' });
  await useCasesFilter.click();

  await expect(page).toHaveURL(/\/search\?q=papyr&section=use-case$/);
  await expect(page.locator('.search-filter-chip.active')).toHaveText('Use Cases');
});
