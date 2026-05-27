import type {
  Block,
  ExcalidrawBlock,
  HeadingBlock,
  Inline,
  ListBlock,
  ListItem,
  MermaidBlock,
  PapyrDocument,
  TableBlock,
} from '@f12o/papyr-core';
import { blockPayload, isBlockKind } from '@f12o/papyr-core';

export type PapyrViewMode = 'document' | 'slides' | 'inline';
export type PapyrViewTheme = 'paper' | 'ink' | 'system';
export type PapyrViewDensity = 'comfortable' | 'compact' | 'dense';
export type PapyrViewLayout = 'article' | 'book' | 'chapter' | 'deck';

export interface RenderPapyrViewOptions {
  document: PapyrDocument;
  mode?: PapyrViewMode;
  theme?: PapyrViewTheme;
  page?: number;
  slide?: number;
  suppressLeadingTitle?: string;
}

export interface RenderDocumentPreviewOptions {
  suppressLeadingTitle?: string;
}

export interface PapyrTocItem {
  id: string;
  level: number;
  text: string;
}

export interface PapyrDocumentViewerOptions {
  document: PapyrDocument;
  markdownSource?: string;
  loadMarkdownSource?: () => Promise<string>;
  suppressLeadingTitle?: string;
  onCopyError?: (error: unknown) => void;
}

export interface PapyrSlide {
  id: string;
  index: number;
  title: string;
  document: PapyrDocument;
}

export interface PapyrSlideViewerOptions {
  document: PapyrDocument;
  slide?: number;
  onSlideChange?: (slide: number, slideCount: number) => void;
}

export interface PapyrViewerOptions extends PapyrDocumentViewerOptions {
  mode?: PapyrViewMode;
  slide?: number;
  onSlideChange?: (slide: number, slideCount: number) => void;
}

export interface PapyrReferenceLink {
  label: string;
  href: string;
  kind?: string;
  summary?: string;
  active?: boolean;
  dataLink?: boolean;
}

export interface PapyrReferenceMetaItem {
  label: string;
  value: string;
}

export interface PapyrReferenceAction {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
  dataLink?: boolean;
}

export interface PapyrReferenceDetail {
  eyebrow?: string;
  title: string;
  summary?: string;
  document: PapyrDocument;
  suppressLeadingTitle?: string;
  loadMarkdownSource?: () => Promise<string>;
  meta?: PapyrReferenceMetaItem[];
  actions?: PapyrReferenceAction[];
  related?: PapyrReferenceLink[];
}

export interface PapyrReferenceLayoutOptions {
  railTitle: string;
  railSummary?: string;
  items: PapyrReferenceLink[];
  detail: PapyrReferenceDetail;
}

export interface MountedPapyrView {
  dispose: () => void;
}

export interface PapyrViewSettings {
  mode: PapyrViewMode;
  theme: PapyrViewTheme;
  density: PapyrViewDensity;
  layout: PapyrViewLayout;
  titleSlide: boolean;
}

interface ViewMeta {
  layout?: unknown;
  titleSlide?: unknown;
  density?: unknown;
}

let mermaidInitialized = false;
let mermaidPromise: Promise<typeof import('mermaid')> | undefined;

export async function renderPapyrView(
  container: HTMLElement,
  options: RenderPapyrViewOptions,
): Promise<void> {
  const settings = resolvePapyrViewSettings(options.document, options);

  if (options.document.blocks.length === 0) {
    container.replaceChildren();
    container.appendChild(message('preview__empty', 'まだプレビューできる内容がありません。'));
    return;
  }

  if (settings.mode === 'inline') {
    await renderInlinePreview(container, options.document, options);
    return;
  }

  if (settings.mode === 'slides') {
    container.replaceChildren(await renderSlideDeckView(options.document, options, settings));
    return;
  }

  container.replaceChildren(await renderDocumentPageView(options.document, options, settings));
}

export async function renderDocumentPreview(
  container: HTMLElement,
  doc: PapyrDocument,
  options: RenderDocumentPreviewOptions = {},
): Promise<void> {
  await renderPapyrView(container, {
    document: doc,
    mode: 'inline',
    suppressLeadingTitle: options.suppressLeadingTitle,
  });
}

export function resolvePapyrViewSettings(
  doc: PapyrDocument,
  options: Pick<RenderPapyrViewOptions, 'mode' | 'theme'> = {},
): PapyrViewSettings {
  const meta = readViewMeta(doc);
  const layout = resolveLayout(meta.layout);
  const mode = options.mode ?? (layout === 'deck' ? 'slides' : 'document');

  return {
    mode,
    theme: options.theme ?? 'paper',
    density: resolveDensity(meta.density),
    layout,
    titleSlide: typeof meta.titleSlide === 'boolean' ? meta.titleSlide : true,
  };
}

export function splitDocumentIntoViewSlides(blocks: Block[]): Block[][] {
  if (blocks.length === 0) return [[]];

  const slides: Block[][] = [];
  let current: Block[] = [];

  for (const block of blocks) {
    if (isSlideBoundary(block) && current.length > 0) {
      slides.push(current);
      current = [block];
      continue;
    }
    current.push(block);
  }

  if (current.length > 0) slides.push(current);
  return slides.length > 0 ? slides : [[]];
}

export function buildPapyrToc(doc: PapyrDocument): PapyrTocItem[] {
  return doc.blocks.flatMap((block) => {
    if (!isBlockKind(block, 'Heading')) return [];
    const text = normalizeHeadingText(block[1].content);
    if (!text) return [];
    return [{ id: block[1].id, level: block[1].level, text }];
  });
}

export function buildPapyrSlides(doc: PapyrDocument): PapyrSlide[] {
  return splitDocumentIntoViewSlides(doc.blocks).map((blocks, index) => ({
    id: `${doc.id}#slide-${index + 1}`,
    index,
    title: resolveSlideTitle(doc, blocks, index),
    document: {
      ...doc,
      id: `${doc.id}#slide-${index + 1}`,
      blocks,
    },
  }));
}

export async function mountPapyrDocumentViewer(
  container: HTMLElement,
  options: PapyrDocumentViewerOptions,
): Promise<MountedPapyrView> {
  let disposed = false;
  const shell = document.createElement('section');
  shell.className = 'papyr-document-viewer';

  const toc = buildPapyrToc(options.document);
  if (toc.length > 0 || options.markdownSource || options.loadMarkdownSource) {
    const aside = document.createElement('aside');
    aside.className = 'papyr-document-viewer__tools';
    if (toc.length > 0) aside.appendChild(renderToc(toc));
    if (options.markdownSource || options.loadMarkdownSource) {
      aside.appendChild(renderCopyButton(options, () => disposed));
    }
    shell.appendChild(aside);
  }

  const surface = document.createElement('div');
  surface.className = 'papyr-document-viewer__surface';
  shell.appendChild(surface);
  container.replaceChildren(shell);

  await renderPapyrView(surface, {
    document: options.document,
    mode: 'document',
    suppressLeadingTitle: options.suppressLeadingTitle,
  });

  return {
    dispose: () => {
      disposed = true;
    },
  };
}

export async function mountPapyrSlideViewer(
  container: HTMLElement,
  options: PapyrSlideViewerOptions,
): Promise<MountedPapyrView> {
  const slides = buildPapyrSlides(options.document);
  let disposed = false;
  let currentSlide = Math.min(
    Math.max(clampPositiveInteger(options.slide, 1), 1),
    Math.max(slides.length, 1),
  );

  const root = document.createElement('section');
  root.className = 'papyr-slide-viewer';
  const surface = document.createElement('div');
  surface.className = 'papyr-slide-viewer__surface';
  const nav = document.createElement('nav');
  nav.className = 'papyr-slide-viewer__nav';
  const prev = button('Previous');
  const status = document.createElement('span');
  const next = button('Next');
  const fullscreen = button('Fullscreen');
  nav.appendChild(prev);
  nav.appendChild(status);
  nav.appendChild(next);
  nav.appendChild(fullscreen);
  root.appendChild(nav);
  root.appendChild(surface);
  container.replaceChildren(root);

  const render = async (): Promise<void> => {
    const slide = slides[currentSlide - 1];
    if (!slide || disposed) return;
    prev.disabled = currentSlide <= 1;
    next.disabled = currentSlide >= slides.length;
    status.textContent = `${currentSlide} / ${slides.length} ${slide.title}`;
    root.dataset.papyrSlideIndex = String(currentSlide);
    root.dataset.papyrSlideCount = String(slides.length);
    options.onSlideChange?.(currentSlide, slides.length);
    await renderPapyrView(surface, {
      document: options.document,
      mode: 'slides',
      slide: currentSlide,
    });
  };

  const go = (delta: number) => {
    currentSlide = Math.min(Math.max(currentSlide + delta, 1), slides.length);
    void render();
  };
  const onPrev = () => go(-1);
  const onNext = () => go(1);
  const onFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void root.requestFullscreen?.();
    }
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.closest('input, textarea, select, button') || target.isContentEditable)
    ) {
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      go(1);
    }
  };

  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);
  fullscreen.addEventListener('click', onFullscreen);
  document.addEventListener('keydown', onKeydown);
  await render();

  return {
    dispose: () => {
      disposed = true;
      prev.removeEventListener('click', onPrev);
      next.removeEventListener('click', onNext);
      fullscreen.removeEventListener('click', onFullscreen);
      document.removeEventListener('keydown', onKeydown);
    },
  };
}

export async function mountPapyrViewer(
  container: HTMLElement,
  options: PapyrViewerOptions,
): Promise<MountedPapyrView> {
  if (options.mode === 'slides') {
    return mountPapyrSlideViewer(container, {
      document: options.document,
      slide: options.slide,
      onSlideChange: options.onSlideChange,
    });
  }
  return mountPapyrDocumentViewer(container, options);
}

export async function mountPapyrReferenceLayout(
  container: HTMLElement,
  options: PapyrReferenceLayoutOptions,
): Promise<MountedPapyrView> {
  const root = document.createElement('section');
  root.className = 'papyr-reference-layout';

  const rail = document.createElement('aside');
  rail.className = 'papyr-reference-layout__rail';
  const railHeader = document.createElement('header');
  railHeader.className = 'papyr-reference-layout__rail-header';
  const railTitle = document.createElement('h2');
  railTitle.className = 'papyr-reference-layout__rail-title';
  railTitle.textContent = options.railTitle;
  railHeader.appendChild(railTitle);
  if (options.railSummary) {
    const summary = document.createElement('p');
    summary.className = 'papyr-reference-layout__rail-summary';
    summary.textContent = options.railSummary;
    railHeader.appendChild(summary);
  }
  rail.appendChild(railHeader);
  rail.appendChild(renderReferenceLinks(options.items, 'papyr-reference-layout__nav'));

  const detail = document.createElement('article');
  detail.className = 'papyr-reference-layout__detail';
  const detailHeader = document.createElement('header');
  detailHeader.className = 'papyr-reference-layout__detail-header';
  if (options.detail.eyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'papyr-reference-layout__eyebrow';
    eyebrow.textContent = options.detail.eyebrow;
    detailHeader.appendChild(eyebrow);
  }
  const title = document.createElement('h1');
  title.className = 'papyr-reference-layout__title';
  title.textContent = options.detail.title;
  detailHeader.appendChild(title);
  if (options.detail.summary) {
    const summary = document.createElement('p');
    summary.className = 'papyr-reference-layout__summary';
    summary.textContent = options.detail.summary;
    detailHeader.appendChild(summary);
  }
  const tools = renderReferenceTools(options.detail);
  if (tools) detailHeader.appendChild(tools);
  detail.appendChild(detailHeader);

  const surface = document.createElement('div');
  surface.className = 'papyr-reference-layout__surface';
  detail.appendChild(surface);
  if (options.detail.related?.length) {
    detail.appendChild(renderReferenceLinks(options.detail.related, 'papyr-reference-layout__related'));
  }

  root.appendChild(rail);
  root.appendChild(detail);
  container.replaceChildren(root);

  const mounted = await mountPapyrDocumentViewer(surface, {
    document: options.detail.document,
    suppressLeadingTitle: options.detail.suppressLeadingTitle,
    loadMarkdownSource: options.detail.loadMarkdownSource,
  });

  return {
    dispose: () => mounted.dispose(),
  };
}

function renderReferenceLinks(items: PapyrReferenceLink[], className: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = className;
  const list = document.createElement('ol');
  for (const item of items) {
    const li = document.createElement('li');
    li.className = `${className}-item`;
    if (item.active) li.dataset.active = 'true';
    const link = document.createElement('a');
    link.className = `${className}-link`;
    link.href = item.href;
    if (item.dataLink) link.dataset.link = '';
    const label = document.createElement('span');
    label.textContent = item.label;
    link.appendChild(label);
    if (item.kind) {
      const kind = document.createElement('small');
      kind.className = `${className}-link-kind`;
      kind.textContent = item.kind;
      link.appendChild(kind);
    }
    if (item.summary) {
      const summary = document.createElement('small');
      summary.className = `${className}-link-summary`;
      summary.textContent = item.summary;
      link.appendChild(summary);
    }
    li.appendChild(link);
    list.appendChild(li);
  }
  nav.appendChild(list);
  return nav;
}

function renderReferenceTools(detail: PapyrReferenceDetail): HTMLElement | null {
  if (!detail.meta?.length && !detail.actions?.length) return null;
  const tools = document.createElement('div');
  tools.className = 'papyr-reference-layout__tools';
  if (detail.meta?.length) {
    const meta = document.createElement('dl');
    meta.className = 'papyr-document-meta';
    for (const item of detail.meta) {
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      dd.textContent = item.value;
      meta.appendChild(dt);
      meta.appendChild(dd);
    }
    tools.appendChild(meta);
  }
  if (detail.actions?.length) {
    const actions = document.createElement('div');
    actions.className = 'papyr-reference-layout__actions';
    for (const item of detail.actions) {
      const link = document.createElement('a');
      link.className = 'papyr-reference-layout__action';
      if (item.variant) link.dataset.variant = item.variant;
      link.href = item.href;
      link.textContent = item.label;
      if (item.dataLink) link.dataset.link = '';
      actions.appendChild(link);
    }
    tools.appendChild(actions);
  }
  return tools;
}

async function renderInlinePreview(
  container: HTMLElement,
  doc: PapyrDocument,
  options: Pick<RenderPapyrViewOptions, 'suppressLeadingTitle'>,
): Promise<void> {
  const blocks = shouldSuppressLeadingTitle(doc, options.suppressLeadingTitle)
    ? doc.blocks.slice(1)
    : doc.blocks;
  const rendered = await Promise.all(blocks.map((block) => renderBlock(block)));
  container.replaceChildren(...rendered);
}

async function renderDocumentPageView(
  doc: PapyrDocument,
  options: RenderPapyrViewOptions,
  settings: PapyrViewSettings,
): Promise<HTMLElement> {
  const pageNumber = clampPositiveInteger(options.page, 1);
  const root = document.createElement('section');
  decorateViewRoot(root, settings, 'document');
  root.dataset.papyrPage = String(pageNumber);

  const page = document.createElement('article');
  page.className = 'papyr-document-page';
  page.dataset.papyrDocumentId = doc.id;

  const title = resolveDocumentTitle(doc);
  const header = document.createElement('header');
  header.className = 'papyr-document-cover';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'papyr-document-cover__eyebrow';
  eyebrow.textContent = formatLayoutLabel(settings.layout);
  const heading = document.createElement('h1');
  heading.className = 'papyr-document-cover__title';
  heading.textContent = title;
  header.appendChild(eyebrow);
  header.appendChild(heading);

  const meta = renderDocumentMeta(doc, pageNumber);
  if (meta) header.appendChild(meta);

  const body = document.createElement('div');
  body.className = 'papyr-document-body';
  const blocks = shouldSuppressLeadingTitle(doc, options.suppressLeadingTitle ?? title)
    ? doc.blocks.slice(1)
    : doc.blocks;
  const rendered = await Promise.all(blocks.map((block) => renderBlock(block)));
  body.replaceChildren(...rendered);

  page.appendChild(header);
  page.appendChild(body);
  root.appendChild(page);
  return root;
}

async function renderSlideDeckView(
  doc: PapyrDocument,
  options: RenderPapyrViewOptions,
  settings: PapyrViewSettings,
): Promise<HTMLElement> {
  const slideGroups = splitDocumentIntoViewSlides(doc.blocks);
  const requestedSlide = clampPositiveInteger(options.slide, 1);
  const selectedSlideIndex = Math.min(requestedSlide - 1, slideGroups.length - 1);
  const selectedBlocks = slideGroups[selectedSlideIndex] ?? [];
  const slideTitle = resolveSlideTitle(doc, selectedBlocks, selectedSlideIndex);
  const titleSlide = settings.titleSlide && isTitleSlide(doc, selectedBlocks, selectedSlideIndex);

  const root = document.createElement('section');
  decorateViewRoot(root, settings, 'slides');
  root.dataset.papyrSlideIndex = String(requestedSlide);
  root.dataset.papyrSlideCount = String(slideGroups.length);

  const slide = document.createElement('article');
  slide.className = titleSlide
    ? 'papyr-slide papyr-slide--title'
    : 'papyr-slide papyr-slide--content';
  slide.dataset.papyrDocumentId = doc.id;
  slide.dataset.papyrSlideTitle = slideTitle;

  if (titleSlide) {
    const header = document.createElement('header');
    header.className = 'papyr-slide-title';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'papyr-slide-title__eyebrow';
    eyebrow.textContent = 'Papyr slide deck';
    const heading = document.createElement('h1');
    heading.className = 'papyr-slide-title__heading';
    heading.textContent = slideTitle;
    const meta = document.createElement('p');
    meta.className = 'papyr-slide-title__meta';
    meta.textContent = `${requestedSlide} / ${slideGroups.length}`;
    header.appendChild(eyebrow);
    header.appendChild(heading);
    header.appendChild(meta);
    slide.appendChild(header);
  }

  const blocks =
    titleSlide && isBlockKind(selectedBlocks[0], 'Heading')
      ? selectedBlocks.slice(1)
      : selectedBlocks;
  const rendered = await Promise.all(blocks.map((block) => renderBlock(block)));
  for (const element of rendered) slide.appendChild(element);
  root.appendChild(slide);
  return root;
}

function decorateViewRoot(
  root: HTMLElement,
  settings: PapyrViewSettings,
  mode: PapyrViewMode,
): void {
  root.className = [
    'papyr-view',
    `papyr-view--${mode}`,
    `papyr-view--theme-${settings.theme}`,
    `papyr-view--density-${settings.density}`,
    `papyr-view--layout-${settings.layout}`,
  ].join(' ');
  root.dataset.papyrViewMode = mode;
  root.dataset.papyrViewDensity = settings.density;
  root.dataset.papyrViewLayout = settings.layout;
}

function renderToc(items: PapyrTocItem[]): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'papyr-document-viewer__toc';
  nav.setAttribute('aria-label', 'Table of contents');
  const list = document.createElement('ol');
  for (const item of items) {
    const li = document.createElement('li');
    li.dataset.papyrTocLevel = String(item.level);
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(item.id)}`;
    link.textContent = item.text;
    li.appendChild(link);
    list.appendChild(li);
  }
  nav.appendChild(list);
  return nav;
}

function renderCopyButton(
  options: PapyrDocumentViewerOptions,
  isDisposed: () => boolean,
): HTMLButtonElement {
  const copy = button('Copy Markdown');
  copy.className = 'papyr-document-viewer__copy';
  copy.addEventListener('click', () => {
    void (async () => {
      try {
        copy.disabled = true;
        const source = options.markdownSource ?? (await options.loadMarkdownSource?.()) ?? '';
        if (!isDisposed()) await navigator.clipboard.writeText(source);
      } catch (error) {
        options.onCopyError?.(error);
      } finally {
        if (!isDisposed()) copy.disabled = false;
      }
    })();
  });
  return copy;
}

function button(label: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  return el;
}

function renderDocumentMeta(doc: PapyrDocument, pageNumber: number): HTMLElement | null {
  const items: Array<[string, string]> = [
    ['Document', doc.id],
    ['Page', String(pageNumber)],
  ];
  if (items.length === 0) return null;

  const list = document.createElement('dl');
  list.className = 'papyr-document-meta';
  for (const [term, value] of items) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  }
  return list;
}

async function renderBlock(block: Block): Promise<HTMLElement> {
  switch (block[0]) {
    case 'Heading': {
      const payload = block[1];
      const el = document.createElement(`h${payload.level}`) as HTMLHeadingElement;
      decorateBlock(el, block);
      appendInline(el, payload.content);
      return el;
    }
    case 'Paragraph': {
      const payload = block[1];
      const el = document.createElement('p');
      decorateBlock(el, block);
      appendInline(el, payload.content);
      return el;
    }
    case 'List': {
      const list = await renderList(block);
      decorateBlock(list, block);
      return list;
    }
    case 'Code': {
      const payload = block[1];
      const pre = document.createElement('pre');
      decorateBlock(pre, block);
      const code = document.createElement('code');
      code.textContent = payload.source;
      if (payload.language) code.dataset.language = payload.language;
      pre.appendChild(code);
      return pre;
    }
    case 'Table':
      return renderTable(block);
    case 'Mermaid': {
      const payload = block[1];
      return renderMermaidBlock(payload.id, payload.source, payload.caption);
    }
    case 'Excalidraw':
      return renderExcalidrawBlock(block);
  }
}

async function renderList(block: ListBlock): Promise<HTMLElement> {
  const payload = blockPayload(block);
  const list = document.createElement(payload.ordered ? 'ol' : 'ul');
  const items = await Promise.all(payload.items.map((item) => renderListItem(item)));
  for (const item of items) list.appendChild(item);
  return list;
}

async function renderListItem(item: ListItem): Promise<HTMLLIElement> {
  const li = document.createElement('li');
  const blocks = await Promise.all(item.blocks.map((block) => renderBlock(block)));
  for (const block of blocks) li.appendChild(block);
  return li;
}

function renderTable(block: TableBlock): HTMLElement {
  const payload = blockPayload(block);
  const wrapper = document.createElement('figure');
  decorateEmbeddedBlock(wrapper, payload.id, block[0]);
  decorateBlock(wrapper, block);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  for (const column of payload.columns) {
    const th = document.createElement('th');
    th.textContent = column.header;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of payload.rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell.text;
      if (cell.colspan) td.colSpan = cell.colspan;
      if (cell.rowspan) td.rowSpan = cell.rowspan;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  if (payload.caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = payload.caption;
    wrapper.appendChild(figcaption);
  }
  return wrapper;
}

async function renderMermaidBlock(
  id: string,
  source: string,
  caption?: string,
): Promise<HTMLElement> {
  const mermaid = await ensureMermaid();
  const figure = document.createElement('figure');
  decorateEmbeddedBlock(figure, id, 'Mermaid');
  figure.classList.add('papyr-block', 'papyr-block--mermaid');

  try {
    const renderId = `mermaid-${sanitizeId(id)}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg, bindFunctions } = await mermaid.render(renderId, source);
    const frame = document.createElement('div');
    frame.innerHTML = svg;
    const svgRoot = frame.querySelector('svg');
    if (svgRoot) svgRoot.removeAttribute('height');
    figure.appendChild(frame);
    if (bindFunctions) bindFunctions(frame);
  } catch (error) {
    figure.appendChild(
      message(
        'preview__error',
        error instanceof Error ? error.message : 'Mermaid の描画に失敗しました',
      ),
    );
  }

  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.appendChild(figcaption);
  }

  return figure;
}

function renderExcalidrawBlock(block: ExcalidrawBlock): HTMLElement {
  const payload = blockPayload(block);
  const figure = document.createElement('figure');
  decorateEmbeddedBlock(figure, payload.id, block[0]);
  decorateBlock(figure, block);
  figure.innerHTML = sceneToSvgMarkup(payload.elements as Array<Record<string, unknown>>);

  if (payload.caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = payload.caption;
    figure.appendChild(figcaption);
  }

  return figure;
}

function decorateBlock(element: HTMLElement, block: Block): void {
  const kind = block[0];
  const payload = blockPayload(block);
  const type = blockTypeClass(kind);
  element.classList.add('papyr-block', `papyr-block--${type}`);
  element.id = payload.id;
  element.dataset.papyrBlockId = payload.id;
  element.dataset.papyrBlockType = type;
}

function decorateEmbeddedBlock(
  element: HTMLElement,
  id: string,
  kind: TableBlock[0] | MermaidBlock[0] | ExcalidrawBlock[0],
): void {
  const type = blockTypeClass(kind);
  element.className = 'diagram-card';
  element.dataset.papyrEmbeddedBlockId = id;
  element.dataset.papyrEmbeddedBlockType = type;
}

function appendInline(container: HTMLElement, runs: Inline[]): void {
  for (const run of runs) {
    let node: Node = document.createTextNode(run.text);
    if (run.marks?.includes('code')) {
      const code = document.createElement('code');
      code.textContent = run.text;
      node = code;
    }
    if (run.marks?.includes('bold')) node = wrap('strong', node);
    if (run.marks?.includes('italic')) node = wrap('em', node);
    if (run.marks?.includes('strike')) node = wrap('s', node);
    if (run.marks?.includes('link') && run.href) {
      const link = document.createElement('a');
      link.href = run.href;
      if (isInternalAbsoluteHref(run.href)) {
        link.dataset.link = 'true';
      } else {
        link.target = '_blank';
        link.rel = 'noreferrer';
      }
      link.appendChild(node);
      node = link;
    }
    container.appendChild(node);
  }
}

function wrap(tag: string, node: Node): HTMLElement {
  const el = document.createElement(tag);
  el.appendChild(node);
  return el;
}

function isInternalAbsoluteHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

function message(className: string, text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

async function ensureMermaid(): Promise<typeof import('mermaid').default> {
  const mermaid = (await (mermaidPromise ??= import('mermaid'))).default;
  if (mermaidInitialized) return mermaid;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
  mermaidInitialized = true;
  return mermaid;
}

function shouldSuppressLeadingTitle(doc: PapyrDocument, title?: string): boolean {
  if (!title) return false;
  const [first] = doc.blocks;
  if (!isBlockKind(first, 'Heading') || first[1].level !== 1) return false;
  return normalizeHeadingText(first[1].content) === normalizeText(title);
}

function resolveDocumentTitle(doc: PapyrDocument): string {
  if (doc.title && normalizeText(doc.title)) return normalizeText(doc.title);
  const heading = doc.blocks.find(
    (block): block is HeadingBlock => isBlockKind(block, 'Heading') && block[1].level === 1,
  );
  if (heading) {
    const title = normalizeHeadingText(heading[1].content);
    if (title) return title;
  }
  return doc.id;
}

function resolveSlideTitle(doc: PapyrDocument, blocks: Block[], index: number): string {
  const [first] = blocks;
  if (isBlockKind(first, 'Heading')) {
    const title = normalizeHeadingText(first[1].content);
    if (title) return title;
  }
  return index === 0 ? resolveDocumentTitle(doc) : `Slide ${index + 1}`;
}

function isTitleSlide(doc: PapyrDocument, blocks: Block[], index: number): boolean {
  if (index !== 0) return false;
  const [first] = blocks;
  if (!isBlockKind(first, 'Heading') || first[1].level !== 1) return false;
  return normalizeHeadingText(first[1].content) === resolveDocumentTitle(doc);
}

function isSlideBoundary(block: Block): block is HeadingBlock {
  return isBlockKind(block, 'Heading') && block[1].level === 2;
}

function normalizeHeadingText(runs: Inline[]): string {
  return normalizeText(runs.map((run) => run.text).join(''));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function readViewMeta(doc: PapyrDocument): ViewMeta {
  const meta = doc.meta?.view;
  if (!isRecord(meta)) return {};
  return meta;
}

function resolveLayout(value: unknown): PapyrViewLayout {
  if (value === 'book' || value === 'chapter' || value === 'deck') return value;
  return 'article';
}

function resolveDensity(value: unknown): PapyrViewDensity {
  if (value === 'compact' || value === 'dense') return value;
  return 'comfortable';
}

function formatLayoutLabel(layout: PapyrViewLayout): string {
  switch (layout) {
    case 'article':
      return 'Document';
    case 'book':
      return 'Book';
    case 'chapter':
      return 'Chapter';
    case 'deck':
      return 'Deck';
  }
}

function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return fallback;
  return value ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-z0-9_-]+/gi, '-');
}

function blockTypeClass(kind: Block[0]): string {
  return kind.toLowerCase();
}

export function sceneToSvgMarkup(elements: Array<Record<string, unknown>>): string {
  const positioned = elements.filter(
    (element): element is Record<string, unknown> & { x: number; y: number } =>
      typeof element.x === 'number' &&
      typeof element.y === 'number' &&
      element.isDeleted !== true &&
      typeof element.type === 'string',
  );

  if (positioned.length === 0) {
    return '<div class="preview__empty">このシーンには Excalidraw 要素がありません。</div>';
  }

  const bounds = measure(positioned);
  const width = Math.max(240, bounds.maxX - bounds.minX + 48);
  const height = Math.max(180, bounds.maxY - bounds.minY + 48);
  const parts = positioned.map((element) =>
    renderSceneElement(element, bounds.minX - 24, bounds.minY - 24),
  );

  return [
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Excalidraw シーン" xmlns="http://www.w3.org/2000/svg">`,
    ...renderArrowheadDefs(positioned),
    '<rect width="100%" height="100%" rx="16" fill="#fffdfa" />',
    ...parts,
    '</svg>',
  ].join('');
}

function renderArrowheadDefs(elements: Array<Record<string, unknown>>): string[] {
  if (!elements.some((element) => element.type === 'arrow')) return [];
  return [
    '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">',
    '<polygon points="0 0, 10 3.5, 0 7" fill="#1e2428" /></marker></defs>',
  ];
}

function measure(elements: Array<Record<string, unknown> & { x: number; y: number }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const x = element.x;
    const y = element.y;
    const width = typeof element.width === 'number' ? element.width : 0;
    const height = typeof element.height === 'number' ? element.height : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return { minX, minY, maxX, maxY };
}

function renderSceneElement(
  element: Record<string, unknown> & { x: number; y: number },
  offsetX: number,
  offsetY: number,
): string {
  const type = String(element.type);
  const stroke = escapeSvg(String(element.strokeColor ?? '#1e2428'));
  const fill = escapeSvg(String(element.backgroundColor ?? 'transparent'));
  const x = element.x - offsetX;
  const y = element.y - offsetY;
  const width = typeof element.width === 'number' ? element.width : 0;
  const height = typeof element.height === 'number' ? element.height : 0;
  const strokeWidth = typeof element.strokeWidth === 'number' ? element.strokeWidth : 2;

  switch (type) {
    case 'rectangle':
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    case 'ellipse':
      return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    case 'arrow': {
      const points = Array.isArray(element.points)
        ? element.points.filter(
            (point): point is [number, number] =>
              Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number',
          )
        : [];
      const [first, ...rest] = points;
      if (!first) return '';
      const startX = x + first[0];
      const startY = y + first[1];
      const path = [
        `M ${startX} ${startY}`,
        ...rest.map((point) => `L ${x + point[0]} ${y + point[1]}`),
      ].join(' ');
      return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)" />`;
    }
    case 'text': {
      const fontSize = typeof element.fontSize === 'number' ? element.fontSize : 18;
      const text = escapeSvg(String(element.text ?? ''));
      return `<text x="${x}" y="${y + fontSize}" fill="${stroke}" font-size="${fontSize}" font-family="Iosevka, SFMono-Regular, monospace">${text}</text>`;
    }
    default:
      return '';
  }
}

function escapeSvg(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
