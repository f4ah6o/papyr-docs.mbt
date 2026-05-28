import { describe, expect, it } from 'vitest';
import type { PapyrDocument } from '@f12o/papyr-core';
import { headingBlock, paragraphBlock } from '@f12o/papyr-core';
import {
  DEFAULT_SLIDE_VIEWPORT_ID,
  buildDocumentSlides,
  buildSlideViewHref,
  isSlidesView,
  resolveSlideIndex,
  resolveSlideViewport,
} from './slides.js';

function createDocument(blocks: PapyrDocument['blocks']): PapyrDocument {
  return {
    id: 'article-demo',
    title: 'Demo Article',
    blocks,
  };
}

describe('buildDocumentSlides', () => {
  it('splits slides at level-2 headings and preserves an intro slide', () => {
    const doc = createDocument([
      headingBlock({ id: 'h1', level: 1, content: [{ text: 'Demo Article' }] }),
      paragraphBlock({ id: 'p1', content: [{ text: 'Intro' }] }),
      headingBlock({ id: 'h2-1', level: 2, content: [{ text: 'Section A' }] }),
      paragraphBlock({ id: 'p2', content: [{ text: 'A body' }] }),
      headingBlock({ id: 'h2-2', level: 2, content: [{ text: 'Section B' }] }),
      paragraphBlock({ id: 'p3', content: [{ text: 'B body' }] }),
    ]);

    const slides = buildDocumentSlides(doc);
    expect(slides).toHaveLength(3);
    expect(slides.map((slide) => slide.title)).toEqual(['Demo Article', 'Section A', 'Section B']);
    expect(slides[0]?.document.blocks).toHaveLength(2);
    expect(slides[1]?.document.blocks[0]).toMatchObject(['Heading', { level: 2 }]);
  });

  it('does not emit an empty intro slide when the document starts with level-2 heading', () => {
    const doc = createDocument([
      headingBlock({ id: 'h2-1', level: 2, content: [{ text: 'Only Slide' }] }),
      paragraphBlock({ id: 'p1', content: [{ text: 'Body' }] }),
    ]);

    const slides = buildDocumentSlides(doc);
    expect(slides).toHaveLength(1);
    expect(slides[0]?.title).toBe('Only Slide');
  });
});

describe('slide view search params', () => {
  it('builds slide view urls and strips params when returning to document mode', () => {
    expect(buildSlideViewHref('/articles/demo', '', { view: 'slides' })).toBe(
      `/articles/demo?view=slides&slide=1&viewport=${DEFAULT_SLIDE_VIEWPORT_ID}`,
    );

    expect(
      buildSlideViewHref('/articles/demo', '?view=slides&slide=2&viewport=1600x900', {
        view: 'document',
      }),
    ).toBe('/articles/demo');

    expect(
      buildSlideViewHref('/articles/demo', '?q=keep', {
        view: 'slides',
        slide: 3,
        viewportId: '1920x1080',
      }),
    ).toBe('/articles/demo?q=keep&view=slides&slide=3&viewport=1920x1080');
  });

  it('detects slide view and clamps indexes and viewport fallbacks', () => {
    expect(isSlidesView('?view=slides')).toBe(true);
    expect(isSlidesView('')).toBe(false);
    expect(resolveSlideIndex('?slide=99', 3)).toBe(2);
    expect(resolveSlideIndex('?slide=0', 3)).toBe(0);
    expect(resolveSlideViewport('?viewport=invalid').id).toBe(DEFAULT_SLIDE_VIEWPORT_ID);
  });
});
