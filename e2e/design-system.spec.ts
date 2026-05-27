import { expect, test, devices } from '@playwright/test';

test('design system page shows surfaces and patterns', async ({ page }) => {
  await page.goto('/design-system');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Papyr all-in-one authoring surface',
    }),
  ).toBeVisible();

  await expect(page.locator('.site-nav').getByRole('link', { name: 'Design' })).toHaveClass(
    /active/,
  );
  await expect(page.getByRole('heading', { name: 'Editor / Viewer / Slide viewer' })).toBeVisible();
  await expect(page.locator('[data-design-system-viewer]')).toBeVisible();
  await expect(page.locator('[data-design-system-slide-viewer]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Component inventory' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reference two-column pattern' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'API reference/detail pattern' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard overview pattern' })).toBeVisible();
});

test('slide viewer controls update status', async ({ page }) => {
  await page.goto('/design-system');

  const slideViewer = page.locator('[data-design-system-slide-viewer]');
  await expect(slideViewer.locator('.papyr-slide-viewer__nav')).toBeVisible();
  const status = slideViewer.locator('.papyr-slide-viewer__nav span');
  await expect(status).toContainText('1 /');
  await slideViewer.getByRole('button', { name: 'Next' }).click();
  await expect(status).toContainText('2 /');
});

test.use({
  ...devices['iPhone 12'],
  browserName: 'chromium',
});

test('design system page fits mobile width', async ({ page }) => {
  await page.goto('/design-system');

  await expect(
    page.getByRole('heading', { name: 'Papyr all-in-one authoring surface' }),
  ).toBeVisible();
  const hasOverflow = await page.locator('.design-system-page').evaluate((node) => {
    const el = node as HTMLElement;
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(hasOverflow).toBe(false);

  const viewer = page.locator('[data-design-system-viewer]');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer).toBeInViewport();
});
