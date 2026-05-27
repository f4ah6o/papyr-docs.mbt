import { expect, test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 12'],
  // The iPhone preset defaults to WebKit, but this suite validates our shared Chromium config.
  browserName: 'chromium',
});

test('article detail reduces header height and suppresses duplicate h1 on mobile', async ({
  page,
}) => {
  await page.goto('/articles/introducing-papyr-docs');

  const header = page.locator('.site-header');
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThan(170);

  await expect(page.locator('.preview-surface > h1')).toHaveCount(0);
  const firstBlock = page.locator('.preview-surface > *').first();
  await expect(firstBlock).toBeVisible();
  await expect(firstBlock).toBeInViewport();
});

test('book detail shows collapsible chapter outline on mobile', async ({ page }) => {
  await page.goto('/books/getting-started');

  const outline = page.locator('.book-main .mobile-outline');
  await expect(outline).toBeVisible();
  await expect(page.locator('.book-sidebar')).toBeHidden();
  await expect(page.locator('.preview-surface > h1')).toHaveCount(0);

  await outline.locator('summary').click();
  await expect(outline.locator('.chapter-list a').first()).toBeVisible();
});

test('chapter detail shows collapsible book outline on mobile', async ({ page }) => {
  await page.goto('/books/getting-started/install');

  const outline = page.locator('.reader-main .mobile-outline');
  await expect(outline).toBeVisible();
  await expect(page.locator('.reader-sidebar')).toBeHidden();
  await expect(page.locator('.preview-surface > h1')).toHaveCount(0);

  const firstBlock = page.locator('.preview-surface > *').first();
  await expect(firstBlock).toBeInViewport();

  await outline.locator('summary').click();
  await expect(outline.locator('.chapter-list a').first()).toBeVisible();
});

test('playground page fits within mobile width and reduces nested spacing', async ({ page }) => {
  await page.goto('/playground');

  const shell = page.locator('.playground-shell');
  await expect(shell).toBeVisible();
  await shell.scrollIntoViewIfNeeded();
  await expect(shell).toBeInViewport();

  const topbar = page.locator('.editor-workspace__topbar');
  await expect(topbar).toBeVisible();
  await topbar.scrollIntoViewIfNeeded();
  await expect(topbar).toBeInViewport();
  const topbarBox = await topbar.boundingBox();
  expect(topbarBox).not.toBeNull();
  expect(topbarBox!.height).toBeLessThan(190);

  const shellHasOverflow = await shell.evaluate((node) => {
    const el = node as HTMLElement;
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(shellHasOverflow).toBe(false);

  const actionsHasOverflow = await page.locator('.editor-workspace__actions').evaluate((node) => {
    const el = node as HTMLElement;
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(actionsHasOverflow).toBe(false);

  await expect(page.locator('.editor-workspace__action').last()).toBeInViewport();
});
