import { expect, test, type Page } from '@playwright/test';
import type { PublicationSummary, PublicationsListResponse } from '../src/shared.js';
import { chapterHref, publicationHref } from '../src/shared.js';
import { DEFAULT_SLIDE_VIEWPORT_ID, buildSlideViewHref } from '../src/slides.js';

async function expectSlideFrameToFitViewport(
  page: Page,
  summaryId: string,
  slideIndex: number,
): Promise<void> {
  // Allow one CSS pixel for subpixel rounding after transform-based slide scaling.
  const tolerancePx = 1;
  const fitsViewport = await page.evaluate((tolerancePx) => {
    const frame = document.querySelector<HTMLElement>('[data-slide-frame]');
    if (!frame) return false;
    const rect = frame.getBoundingClientRect();
    return (
      rect.top >= -tolerancePx &&
      rect.left >= -tolerancePx &&
      rect.bottom <= window.innerHeight + tolerancePx &&
      rect.right <= window.innerWidth + tolerancePx
    );
  }, tolerancePx);
  expect(fitsViewport, `${summaryId} slide ${slideIndex} did not fit within the viewport`).toBe(
    true,
  );
}

test('published docs fit within the default slide viewport', async ({ page, request }) => {
  test.slow();

  const response = await request.get('/api/publications?published=true');
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as PublicationsListResponse;
  const publications = payload.items;
  const booksById = new Map(
    publications
      .filter(
        (summary): summary is PublicationSummary & { kind: 'book' } => summary.kind === 'book',
      )
      .map((summary) => [summary.id, summary]),
  );

  for (const summary of publications) {
    const baseHref =
      summary.kind === 'chapter'
        ? chapterHref(booksById.get(summary.bookId ?? '')?.slug ?? '', summary.slug)
        : publicationHref(summary);
    expect(baseHref, `${summary.id} is missing a slide-capable route`).toBeTruthy();

    await page.goto(
      buildSlideViewHref(baseHref, '', {
        view: 'slides',
        viewportId: DEFAULT_SLIDE_VIEWPORT_ID,
      }),
    );

    const viewer = page.locator('[data-slide-viewer]');
    const frame = page.locator('[data-slide-frame]');
    await expect(viewer, `${summary.id} did not enter slide view`).toBeVisible();
    await expect(frame).toHaveAttribute('data-slide-ready', 'true');

    const slideCount = Number((await viewer.getAttribute('data-slide-count')) ?? '0');
    expect(slideCount, `${summary.id} produced no slides`).toBeGreaterThan(0);

    for (let slideIndex = 1; slideIndex <= slideCount; slideIndex += 1) {
      await expect(viewer).toHaveAttribute('data-slide-index', String(slideIndex));
      await expect(frame).toHaveAttribute('data-slide-ready', 'true');
      await expectSlideFrameToFitViewport(page, summary.id, slideIndex);

      const hasOverflow = await frame.evaluate((node) => {
        const surface = node.querySelector<HTMLElement>('[data-slide-surface]');
        if (!surface) return true;
        return (
          surface.scrollWidth > surface.clientWidth + 1 ||
          surface.scrollHeight > surface.clientHeight + 1
        );
      });
      expect(hasOverflow, `${summary.id} slide ${slideIndex} overflowed`).toBe(false);

      if (slideIndex < slideCount) {
        await page.getByRole('button', { name: '次へ' }).click();
        await expect(viewer).toHaveAttribute('data-slide-index', String(slideIndex + 1));
      }
    }
  }
});
