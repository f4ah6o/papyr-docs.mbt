import { describe, expect, it } from 'vitest';
import type { PapyrDocument } from '@f12o/papyr-core';
import { headingBlock, paragraphBlock } from '@f12o/papyr-core';
import {
  resolvePapyrViewSettings,
  sceneToSvgMarkup,
  splitDocumentIntoViewSlides,
} from './render.js';

function createDocument(partial: Partial<PapyrDocument> = {}): PapyrDocument {
  return {
    id: 'doc-1',
    title: 'Document One',
    blocks: [
      headingBlock({ id: 'h1', level: 1, content: [{ text: 'Document One' }] }),
      paragraphBlock({ id: 'p1', content: [{ text: 'Intro' }] }),
    ],
    ...partial,
  };
}

describe('resolvePapyrViewSettings', () => {
  it('uses document view defaults for normal documents', () => {
    expect(resolvePapyrViewSettings(createDocument())).toEqual({
      mode: 'document',
      theme: 'paper',
      density: 'comfortable',
      layout: 'article',
      titleSlide: true,
    });
  });

  it('reads optional view metadata with safe fallbacks', () => {
    expect(
      resolvePapyrViewSettings(
        createDocument({
          meta: {
            view: {
              layout: 'deck',
              titleSlide: false,
              density: 'dense',
            },
          },
        }),
        { theme: 'ink' },
      ),
    ).toEqual({
      mode: 'slides',
      theme: 'ink',
      density: 'dense',
      layout: 'deck',
      titleSlide: false,
    });
  });
});

describe('splitDocumentIntoViewSlides', () => {
  it('uses level-2 headings as slide boundaries', () => {
    const slides = splitDocumentIntoViewSlides([
      headingBlock({ id: 'h1', level: 1, content: [{ text: 'Title' }] }),
      paragraphBlock({ id: 'p1', content: [{ text: 'Intro' }] }),
      headingBlock({ id: 'h2-a', level: 2, content: [{ text: 'A' }] }),
      paragraphBlock({ id: 'p2', content: [{ text: 'A body' }] }),
      headingBlock({ id: 'h2-b', level: 2, content: [{ text: 'B' }] }),
    ]);

    expect(slides).toHaveLength(3);
    expect(slides.map((slide) => slide[0]?.[1].id)).toEqual(['h1', 'h2-a', 'h2-b']);
  });
});

describe('sceneToSvgMarkup', () => {
  it('renders basic excalidraw shapes into svg', () => {
    const markup = sceneToSvgMarkup([
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 120,
        height: 60,
        strokeColor: '#111111',
        backgroundColor: 'transparent',
        strokeWidth: 2,
      },
      {
        type: 'text',
        x: 24,
        y: 16,
        text: 'Hello',
        fontSize: 20,
        strokeColor: '#222222',
      },
      {
        type: 'arrow',
        x: 120,
        y: 30,
        width: 80,
        height: 0,
        strokeColor: '#333333',
        strokeWidth: 2,
        points: [
          [0, 0],
          [80, 0],
        ],
      },
    ]);

    expect(markup).toContain('<svg');
    expect(markup).toContain('<rect');
    expect(markup).toContain('<text');
    expect(markup).toContain('Hello');
    expect(markup).toContain('marker-end="url(#arrowhead)"');
  });

  it('renders a friendly empty state for blank scenes', () => {
    expect(sceneToSvgMarkup([])).toContain('このシーンには Excalidraw 要素がありません');
  });
});
