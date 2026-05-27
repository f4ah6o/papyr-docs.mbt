import type { PapyrDocument } from '@f12o/papyr-core';
import { buildPapyrSlides } from '@f12o/papyr-preview';

export interface SlideViewportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface DocumentSlide {
  id: string;
  index: number;
  title: string;
  document: PapyrDocument;
}

export const SLIDE_VIEWPORT_PRESETS: SlideViewportPreset[] = [
  { id: '1280x720', label: '1280 × 720', width: 1280, height: 720 },
  { id: '1600x900', label: '1600 × 900', width: 1600, height: 900 },
  { id: '1920x1080', label: '1920 × 1080', width: 1920, height: 1080 },
];

export const DEFAULT_SLIDE_VIEWPORT_ID = '1280x720';

export function buildDocumentSlides(doc: PapyrDocument): DocumentSlide[] {
  return buildPapyrSlides(doc);
}

export function isSlidesView(search: string): boolean {
  return new URLSearchParams(search).get('view') === 'slides';
}

export function resolveSlideIndex(search: string, slideCount: number): number {
  if (slideCount <= 0) return 0;
  const value = Number(new URLSearchParams(search).get('slide'));
  if (!Number.isInteger(value)) return 0;
  return clamp(value - 1, 0, slideCount - 1);
}

export function resolveSlideViewport(search: string): SlideViewportPreset {
  const value = new URLSearchParams(search).get('viewport');
  return SLIDE_VIEWPORT_PRESETS.find((preset) => preset.id === value) ?? defaultSlideViewport();
}

export function defaultSlideViewport(): SlideViewportPreset {
  const preset = SLIDE_VIEWPORT_PRESETS.find(
    (candidate) => candidate.id === DEFAULT_SLIDE_VIEWPORT_ID,
  );
  if (!preset) {
    throw new Error(`Missing default slide viewport preset: ${DEFAULT_SLIDE_VIEWPORT_ID}`);
  }
  return preset;
}

export function buildSlideViewHref(
  pathname: string,
  search: string,
  options: {
    view?: 'document' | 'slides';
    slide?: number;
    viewportId?: string;
  } = {},
): string {
  const params = new URLSearchParams(search);
  const view = options.view ?? (isSlidesView(search) ? 'slides' : 'document');

  if (view === 'slides') {
    const slide = Number.isInteger(options.slide) && (options.slide ?? 0) > 0 ? options.slide : 1;
    const viewportId = hasSlideViewport(options.viewportId)
      ? options.viewportId
      : defaultSlideViewport().id;
    params.set('view', 'slides');
    params.set('slide', String(slide));
    params.set('viewport', viewportId);
  } else {
    params.delete('view');
    params.delete('slide');
    params.delete('viewport');
  }

  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}

function hasSlideViewport(id?: string): id is string {
  return typeof id === 'string' && SLIDE_VIEWPORT_PRESETS.some((preset) => preset.id === id);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
