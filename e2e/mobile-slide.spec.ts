import { expect, test, type Locator, type Page } from '@playwright/test';

const SUBPIXEL_TOLERANCE = 1;

async function expectFrameToFitViewport(page: Page, frame: Locator): Promise<void> {
  const frameRect = await frame.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  });
  const viewport = await page.evaluate(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));

  expect(frameRect.width).toBeGreaterThan(0);
  expect(frameRect.height).toBeGreaterThan(0);
  expect(frameRect.left).toBeGreaterThanOrEqual(0);
  expect(frameRect.top).toBeGreaterThanOrEqual(0);
  expect(frameRect.right).toBeLessThanOrEqual(viewport.width + SUBPIXEL_TOLERANCE);
  expect(frameRect.bottom).toBeLessThanOrEqual(viewport.height + SUBPIXEL_TOLERANCE);
}

test('article slide view remains visible on iOS Safari', async ({ page }) => {
  await page.goto('/articles/introducing-papyr-docs?view=slides');

  const viewer = page.locator('[data-slide-viewer]');
  const frame = page.locator('[data-slide-frame]');
  const nextButton = page.getByRole('button', { name: '次へ' });
  const prevButton = page.getByRole('button', { name: '前へ' });

  await expect(viewer).toBeVisible();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '1');
  await expectFrameToFitViewport(page, frame);

  await nextButton.click();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '2');
  await expectFrameToFitViewport(page, frame);

  await prevButton.click();
  await expect(frame).toHaveAttribute('data-slide-ready', 'true');
  await expect(viewer).toHaveAttribute('data-slide-index', '1');
});
