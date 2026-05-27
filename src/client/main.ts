import type { PapyrDocument } from '@f12o/papyr-core';
import type {
  AppRoute,
  BookPayload,
  PublicationFilters,
  PublicationSection,
  PublicationSummary,
  PublicationsListResponse,
} from '../shared.js';
import {
  chapterHref,
  escapeHtml,
  findChapterBySlugs,
  findPublicationBySlug,
  isPublicationSection,
  publicationHref,
  resolveLlmRedirectTarget,
  resolveAppRoute,
  searchHref,
} from '../shared.js';
import {
  SLIDE_VIEWPORT_PRESETS,
  buildDocumentSlides,
  buildSlideViewHref,
  clamp,
  isSlidesView,
  resolveSlideIndex,
  resolveSlideViewport,
} from '../slides.js';
import { mountPapyrReferenceLayout, mountPapyrViewer, renderPapyrView } from './preview.js';
import {
  countBookChapters,
  formatSectionLabel,
  formatUpdatedAt,
  renderArticlesBody,
  renderBooksBody,
  renderChapterLink,
  renderDocumentModeActions,
  renderEmptyState,
  renderErrorPanel,
  renderHomeBody,
  renderLoadingPanel,
  renderNotFoundPanel,
  renderPrimaryNav,
  renderRecommendedNextSteps,
  renderShell,
  renderTopics,
  renderUseCasesBody,
  resolveParentBookTitle,
  summaryHref,
} from './render/index.js';
import { registerDocsWebMcp } from './docs-webmcp.js';
import { ensureSearchEngine, type SearchEngine } from './search.js';
import './papyr-preview.css';

const root = mustDiv(document, '#app');
let disposePage: (() => void) | undefined;

const state = {
  route: resolveAppRoute(window.location.pathname, window.location.search),
  renderToken: 0,
};

const SEARCH_SECTION_FILTERS: Array<{ value: 'all' | PublicationSection; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'use-case', label: 'Use Cases' },
  { value: 'package', label: 'Packages' },
  { value: 'article', label: 'Articles' },
];

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest<HTMLAnchorElement>('a[data-link]');
  if (!link) return;
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

window.addEventListener('popstate', () => {
  state.route = resolveAppRoute(window.location.pathname, window.location.search);
  renderCurrentRoute();
});

void registerDocsWebMcp({
  listPublications: async (filters = {}) => {
    const publications = await fetchPublications(filters);
    return publications
      .map((summary) => {
        const href = summaryHref(summary, publications);
        return href ? { ...summary, href } : null;
      })
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  },
  readMarkdown: async (path) => {
    const markdownPath = resolveDocsMarkdownPath(path);
    return {
      path: markdownPath,
      markdown: await requestText(markdownPath),
    };
  },
  search: async (query, options = {}) => {
    const engine = await ensureSearchEngine();
    const publications = await fetchPublications({ published: true });
    const summariesById = new Map(publications.map((summary) => [summary.id, summary]));
    const limit = Math.max(1, Math.min(20, options.limit ?? 5));
    return engine
      .search(query)
      .filter((hit) => summariesById.has(hit.id))
      .filter((hit) => {
        if (!options.section || options.section === 'all') return true;
        return summariesById.get(hit.id)?.section === options.section;
      })
      .slice(0, limit)
      .map((hit) => {
        const summary = summariesById.get(hit.id);
        if (!summary) return null;
        const href = summaryHref(summary, publications);
        if (!href) return null;
        return {
          id: summary.id,
          title: summary.title,
          href,
          kind: summary.kind,
          section: summary.section,
          snippet: hit.blockMatches?.[0]?.snippet ?? summary.summary,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },
  navigate,
  getCurrentPage: () => ({
    path: `${window.location.pathname}${window.location.search}`,
    title: document.title,
    routeName: state.route.name,
  }),
});

renderCurrentRoute();

async function renderApp(): Promise<void> {
  const token = ++state.renderToken;
  const currentSearch = window.location.search;
  state.route = resolveAppRoute(window.location.pathname, currentSearch);
  disposePage?.();
  disposePage = undefined;
  root.innerHTML = renderShell(state.route, renderLoadingPanel(), {
    immersive: shouldRenderSlidesView(state.route, currentSearch),
  });
  const pageEl = mustElement(root, '#page');
  attachSearchFormHandler();

  try {
    switch (state.route.name) {
      case 'home':
        await renderHomePage(pageEl, token);
        return;
      case 'articles':
        await renderArticlesPage(pageEl, token);
        return;
      case 'use-cases':
        await renderUseCasesPage(pageEl, token);
        return;
      case 'article':
        await renderArticlePage(pageEl, token, state.route.slug, currentSearch);
        return;
      case 'books':
        await renderBooksPage(pageEl, token);
        return;
      case 'book':
        await renderBookPage(pageEl, token, state.route.slug, currentSearch);
        return;
      case 'chapter':
        await renderChapterPage(
          pageEl,
          token,
          state.route.bookSlug,
          state.route.chapterSlug,
          currentSearch,
        );
        return;
      case 'design-system':
        await renderDesignSystemPage(pageEl, token);
        return;
      case 'playground':
        await renderPlaygroundPage(pageEl, token);
        return;
      case 'advanced-playground':
        await renderAdvancedPlaygroundPage(pageEl, token);
        return;
      case 'search':
        await renderSearchPage(
          pageEl,
          token,
          state.route.query,
          resolveSearchSectionFilter(currentSearch),
        );
        return;
      case 'not-found':
        pageEl.innerHTML = renderNotFoundPanel();
        return;
    }
  } catch (error) {
    if (token !== state.renderToken) return;
    pageEl.innerHTML = renderErrorPanel(asMessage(error));
  }
}

async function renderHomePage(container: HTMLElement, token: number): Promise<void> {
  const publications = await fetchPublications({ published: true });
  if (token !== state.renderToken) return;
  container.innerHTML = renderHomeBody(publications);
}

async function renderUseCasesPage(container: HTMLElement, token: number): Promise<void> {
  const publications = await fetchPublications({ published: true, section: 'use-case' });
  if (token !== state.renderToken) return;
  container.innerHTML = renderUseCasesBody(publications);
}

async function renderArticlesPage(container: HTMLElement, token: number): Promise<void> {
  const publications = await fetchPublications({ kind: 'article', published: true });
  if (token !== state.renderToken) return;
  container.innerHTML = renderArticlesBody(publications);
}

async function renderArticlePage(
  container: HTMLElement,
  token: number,
  slug: string,
  currentSearch: string,
): Promise<void> {
  const publications = await fetchPublications({ kind: 'article', published: true });
  const article = findPublicationBySlug(publications, 'article', slug);
  if (!article || article.kind !== 'article') {
    if (token !== state.renderToken) return;
    container.innerHTML = renderNotFoundPanel('article が見つかりません。');
    return;
  }

  const doc = await fetchPublication(article.id);
  if (token !== state.renderToken) return;
  const articleHref = publicationHref({ kind: 'article', slug: article.slug });

  if (shouldRenderSlidesView(state.route, currentSearch)) {
    await renderSlidesPage(container, token, {
      currentSearch,
      summary: article,
      doc,
      documentHref: articleHref,
    });
    return;
  }

  container.innerHTML = `
    <article class="article-page">
      <header class="article-header">
        <p class="eyebrow">article</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-header__summary">${escapeHtml(article.summary)}</p>
        <div class="meta-row">
          <span>${escapeHtml(article.emoji ?? '📝')}</span>
          <span>${article.updatedAt ? escapeHtml(formatUpdatedAt(article.updatedAt)) : 'Draft'}</span>
        </div>
        ${renderTopics(article.topics)}
        ${renderDocumentModeActions(articleHref)}
      </header>
      <section class="preview-card">
        <div id="article-preview" class="preview-surface"></div>
      </section>
      ${renderRecommendedNextSteps(article, publications)}
    </article>
  `;

  const previewEl = mustDiv(container, '#article-preview');
  await renderPreviewSafely(previewEl, doc, token, markdownHref(articleHref));
}

async function renderBooksPage(container: HTMLElement, token: number): Promise<void> {
  const publications = await fetchPublications({ published: true });
  if (token !== state.renderToken) return;
  container.innerHTML = renderBooksBody(publications);
}
async function renderBookPage(
  container: HTMLElement,
  token: number,
  slug: string,
  currentSearch: string,
): Promise<void> {
  const publications = await fetchPublications({ published: true });
  const book = findPublicationBySlug(publications, 'book', slug);
  if (!book || book.kind !== 'book') {
    if (token !== state.renderToken) return;
    container.innerHTML = renderNotFoundPanel('book が見つかりません。');
    return;
  }

  const payload = await fetchBook(book.id);
  if (token !== state.renderToken) return;
  const bookHref = publicationHref({ kind: 'book', slug: book.slug });

  if (shouldRenderSlidesView(state.route, currentSearch)) {
    await renderSlidesPage(container, token, {
      currentSearch,
      summary: book,
      doc: payload.book,
      documentHref: bookHref,
    });
    return;
  }

  const publishedChapters = payload.chapters.filter((chapter) => {
    const summary = publications.find((item) => item.id === chapter.id);
    return summary?.kind === 'chapter' && summary.published;
  });

  container.innerHTML = `
    <section class="book-layout">
      <article class="book-main">
        <header class="article-header">
          <p class="eyebrow">book</p>
          <h1>${escapeHtml(book.title)}</h1>
          <p class="article-header__summary">${escapeHtml(book.summary)}</p>
          <div class="meta-row">
            <span>${escapeHtml(book.emoji ?? '📘')}</span>
            <span>${publishedChapters.length} chapters</span>
          </div>
          ${renderTopics(book.topics)}
          ${renderDocumentModeActions(bookHref)}
        </header>
        <details class="panel mobile-outline">
          <summary class="mobile-outline__summary">
            <span>目次</span>
            <small>${publishedChapters.length} 章</small>
          </summary>
          <div class="mobile-outline__body">
            ${
              publishedChapters.length > 0
                ? `<ol class="chapter-list">${publishedChapters
                    .map((chapter) => renderChapterLink(book, chapter))
                    .join('')}</ol>`
                : renderEmptyState('公開済み chapter はまだありません。')
            }
          </div>
        </details>
        <section class="preview-card">
          <div id="book-preview" class="preview-surface"></div>
        </section>
        ${renderRecommendedNextSteps(book, publications)}
      </article>
      <aside class="book-sidebar">
        <div class="panel">
          <p class="eyebrow">chapters</p>
          <h2>目次</h2>
          ${
            publishedChapters.length > 0
              ? `<ol class="chapter-list">${publishedChapters
                  .map((chapter) => renderChapterLink(book, chapter))
                  .join('')}</ol>`
              : renderEmptyState('公開済み chapter はまだありません。')
          }
        </div>
      </aside>
    </section>
  `;

  const previewEl = mustDiv(container, '#book-preview');
  await renderPreviewSafely(previewEl, payload.book, token, markdownHref(bookHref));
}

async function renderChapterPage(
  container: HTMLElement,
  token: number,
  bookSlug: string,
  chapterSlug: string,
  currentSearch: string,
): Promise<void> {
  const publications = await fetchPublications({ published: true });
  const match = findChapterBySlugs(publications, bookSlug, chapterSlug);
  if (!match) {
    if (token !== state.renderToken) return;
    container.innerHTML = renderNotFoundPanel('chapter が見つかりません。');
    return;
  }

  const payload = await fetchBook(match.book.id);
  if (token !== state.renderToken) return;

  const publishedChapters = payload.chapters.filter((chapter) => {
    const summary = publications.find((item) => item.id === chapter.id);
    return summary?.kind === 'chapter' && summary.published;
  });
  const publishedChapterSummaries = publishedChapters
    .map((doc) => ({
      doc,
      summary: publications.find(
        (item): item is PublicationSummary & { kind: 'chapter' } =>
          item.kind === 'chapter' && item.id === doc.id && item.published,
      ),
    }))
    .filter(
      (entry): entry is { doc: PapyrDocument; summary: PublicationSummary & { kind: 'chapter' } } =>
        entry.summary !== undefined,
    );
  const chapter = publishedChapters.find((doc) => doc.id === match.chapter.id) ?? null;
  if (!chapter) {
    container.innerHTML = renderNotFoundPanel('chapter が見つかりません。');
    return;
  }

  if (shouldRenderSlidesView(state.route, currentSearch)) {
    await renderSlidesPage(container, token, {
      currentSearch,
      summary: match.chapter,
      doc: chapter,
      documentHref: chapterHref(match.book.slug, match.chapter.slug),
    });
    return;
  }

  container.innerHTML = `
    <section class="reader-layout reader-layout--reference">
      <article class="reader-main">
        <header class="article-header">
          <p class="eyebrow">chapter</p>
          <h1>${escapeHtml(match.chapter.title)}</h1>
          <p class="article-header__summary">${escapeHtml(match.chapter.summary)}</p>
          ${renderTopics(match.chapter.topics)}
          ${renderDocumentModeActions(chapterHref(match.book.slug, match.chapter.slug))}
        </header>
        <details class="panel mobile-outline">
          <summary class="mobile-outline__summary">
            <span>${escapeHtml(match.book.title)}</span>
            <small>${publishedChapters.length} 章</small>
          </summary>
          <div class="mobile-outline__body">
            <p class="mobile-outline__description">${escapeHtml(match.book.summary)}</p>
            <ol class="chapter-list">
              ${publishedChapters.map((doc) => renderChapterLink(match.book, doc, chapter.id)).join('')}
            </ol>
          </div>
        </details>
        <section class="preview-card preview-card--reference">
          <div id="chapter-preview" class="preview-surface reference-preview-surface"></div>
        </section>
      </article>
      <aside class="reader-sidebar">
        <div class="panel">
          <p class="eyebrow">book</p>
          <h2><a data-link href="${publicationHref(match.book)}">${escapeHtml(match.book.title)}</a></h2>
          <p>${escapeHtml(match.book.summary)}</p>
          <ol class="chapter-list">
            ${publishedChapters.map((doc) => renderChapterLink(match.book, doc, chapter.id)).join('')}
          </ol>
        </div>
      </aside>
      ${renderRecommendedNextSteps(match.chapter, publications)}
    </section>
  `;

  const previewEl = mustDiv(container, '#chapter-preview');
  if (token !== state.renderToken) return;
  const currentChapterHref = chapterHref(match.book.slug, match.chapter.slug);
  const mounted = await mountPapyrReferenceLayout(previewEl, {
    railTitle: match.book.title,
    railSummary: match.book.summary,
    items: publishedChapterSummaries.map(({ doc, summary }) => ({
      label: doc.title ?? summary.title,
      href: chapterHref(match.book.slug, summary.slug),
      kind: 'chapter',
      summary: summary.summary,
      active: doc.id === chapter.id,
      dataLink: true,
    })),
    detail: {
      eyebrow: 'chapter',
      title: match.chapter.title,
      summary: match.chapter.summary,
      document: chapter,
      suppressLeadingTitle: chapter.title,
      loadMarkdownSource: () => requestText(markdownHref(currentChapterHref)),
      meta: [
        { label: 'Book', value: match.book.title },
        { label: 'Chapters', value: String(publishedChapters.length) },
      ],
      actions: [
        {
          label: 'Slide view',
          href: `${currentChapterHref}?view=slides`,
          variant: 'secondary',
          dataLink: true,
        },
        { label: 'Raw Markdown', href: markdownHref(currentChapterHref), variant: 'secondary' },
      ],
      related: [
        {
          label: match.book.title,
          href: publicationHref(match.book),
          kind: 'book',
          summary: match.book.summary,
          dataLink: true,
        },
      ],
    },
  });
  disposePage = () => mounted.dispose();
}

async function renderPlaygroundPage(container: HTMLElement, token: number): Promise<void> {
  container.innerHTML = `
    <section class="panel">
      <p id="playground-loading">playground を読み込み中...</p>
      <div id="playground-root" class="playground-mount"></div>
    </section>
  `;

  const mountEl = mustDiv(container, '#playground-root');
  const mod = await import('./playground/index.js').catch(() => null);
  if (!mod) {
    container.innerHTML = `
      <section class="panel">
        <p>Playground の読み込みに失敗しました。ページを再読み込みしてください。</p>
      </section>
    `;
    return;
  }
  if (token !== state.renderToken) return;
  container.querySelector('#playground-loading')?.remove();
  disposePage = mod.mountPlayground(mountEl);
}

async function renderDesignSystemPage(container: HTMLElement, token: number): Promise<void> {
  container.innerHTML = `
    <div id="design-system-root" class="design-system-mount">
      <p id="design-system-loading">design system を読み込み中...</p>
    </div>
  `;

  const mountEl = mustDiv(container, '#design-system-root');
  const mod = await import('./design-system/index.js').catch(() => null);
  if (!mod) {
    container.innerHTML = `
      <section class="panel">
        <p>Design system の読み込みに失敗しました。ページを再読み込みしてください。</p>
      </section>
    `;
    return;
  }
  if (token !== state.renderToken) return;
  container.querySelector('#design-system-loading')?.remove();
  disposePage = mod.mountDesignSystem(mountEl);
}

async function renderAdvancedPlaygroundPage(container: HTMLElement, token: number): Promise<void> {
  container.innerHTML = `
    <section class="panel">
      <p id="advanced-playground-loading">advanced playground を読み込み中...</p>
      <div id="advanced-playground-root" class="playground-mount"></div>
    </section>
  `;

  const mountEl = mustDiv(container, '#advanced-playground-root');
  const mod = await import('./advanced-playground/index.js').catch(() => null);
  if (!mod) {
    container.innerHTML = `
      <section class="panel">
        <p>Advanced Playground の読み込みに失敗しました。ページを再読み込みしてください。</p>
      </section>
    `;
    return;
  }
  if (token !== state.renderToken) return;
  container.querySelector('#advanced-playground-loading')?.remove();
  disposePage = mod.mountAdvancedPlayground(mountEl);
}

async function renderSearchPage(
  container: HTMLElement,
  token: number,
  query: string,
  section: PublicationSection | 'all',
): Promise<void> {
  container.innerHTML = `
    <section class="hero hero--compact">
      <div class="hero__body">
        <p class="eyebrow">search</p>
        <h1>${query ? `「${escapeHtml(query)}」の検索結果` : '検索'}</h1>
        <p class="hero__lead">section ごとに絞り込みながら、title / summary / 本文を横断検索できます。</p>
      </div>
    </section>
    <section class="panel search-filter-panel">
      <div class="search-filter-row" aria-label="Search section filters">
        ${SEARCH_SECTION_FILTERS.map((item) => {
          const active = item.value === section;
          const href = searchHref(query, item.value);
          return `<a class="search-filter-chip${active ? ' active' : ''}" data-link href="${href}"${
            active ? ' aria-current="page"' : ''
          }>${escapeHtml(item.label)}</a>`;
        }).join('')}
      </div>
    </section>
    <section class="section" id="search-results">
      ${renderLoadingPanel()}
    </section>
  `;

  const resultsEl = mustElement(container, '#search-results');

  if (!query.trim()) {
    resultsEl.innerHTML = renderEmptyState('上部の検索ボックスにキーワードを入力してください。');
    return;
  }

  let engine: SearchEngine;
  try {
    engine = await ensureSearchEngine();
  } catch (error) {
    if (token !== state.renderToken) return;
    resultsEl.innerHTML = renderErrorPanel(asMessage(error));
    return;
  }
  if (token !== state.renderToken) return;

  const publications = await fetchPublications({ published: true });
  if (token !== state.renderToken) return;

  const summariesById = new Map(publications.map((summary) => [summary.id, summary]));
  const hits = engine
    .search(query)
    .filter((hit) => summariesById.has(hit.id))
    .filter((hit) => {
      if (section === 'all') return true;
      const summary = summariesById.get(hit.id);
      return summary?.section === section;
    });

  if (hits.length === 0) {
    resultsEl.innerHTML = renderEmptyState('ヒットするドキュメントはありませんでした。');
    return;
  }

  resultsEl.innerHTML = `
    <ol class="search-list">
      ${hits
        .map((hit) => {
          const summary = summariesById.get(hit.id);
          if (!summary) return '';
          const href = summaryHref(summary, publications);
          if (!href) return '';
          const snippet = hit.blockMatches?.[0]?.snippet ?? summary.summary;
          return `
            <li class="search-list__item">
              <a data-link href="${href}">
                <div class="search-list__meta">
                  <p class="eyebrow">${escapeHtml(summary.kind)}</p>
                  <span>${escapeHtml(formatSectionLabel(summary.section))}</span>
                  ${
                    summary.kind === 'chapter'
                      ? `<span>${escapeHtml(resolveParentBookTitle(summary, publications) ?? '')}</span>`
                      : ''
                  }
                </div>
                <h3>${escapeHtml(summary.title)}</h3>
                <p class="search-list__snippet">${escapeHtml(snippet)}</p>
              </a>
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
}

interface SlidesPageOptions {
  currentSearch: string;
  summary: PublicationSummary;
  doc: PapyrDocument;
  documentHref: string;
}

interface WebkitFullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

async function renderSlidesPage(
  container: HTMLElement,
  token: number,
  options: SlidesPageOptions,
): Promise<void> {
  const slides = buildDocumentSlides(options.doc);
  let currentSlideIndex = resolveSlideIndex(options.currentSearch, slides.length);
  let currentViewport = resolveSlideViewport(options.currentSearch);

  container.innerHTML = `
    <section class="slide-viewer" data-slide-viewer data-slide-count="${slides.length}">
      <div class="panel slide-viewer__toolbar">
        <div class="slide-viewer__header">
          <div class="slide-viewer__copy">
            <p class="eyebrow">${escapeHtml(options.summary.kind)}</p>
            <h1>${escapeHtml(options.summary.title)}</h1>
            <p class="slide-viewer__summary">${escapeHtml(options.summary.summary)}</p>
            ${renderTopics(options.summary.topics)}
          </div>
          <div class="slide-viewer__actions">
            <a class="button button--secondary" data-link href="${options.documentHref}">通常表示</a>
            <button
              id="slide-fullscreen"
              class="button button--secondary slide-viewer__fullscreen"
              type="button"
              hidden
              aria-pressed="false"
            >
              全画面表示
            </button>
            <label class="slide-viewer__viewport">
              <span>Viewport</span>
              <select id="slide-viewport-select">
                ${SLIDE_VIEWPORT_PRESETS.map((preset) => {
                  const selected = preset.id === currentViewport.id ? ' selected' : '';
                  return `<option value="${preset.id}"${selected}>${escapeHtml(preset.label)}</option>`;
                }).join('')}
              </select>
            </label>
          </div>
        </div>
        <div class="slide-viewer__nav">
          <div class="slide-viewer__status">
            <strong id="slide-counter"></strong>
            <span id="slide-title"></span>
          </div>
          <div class="slide-viewer__buttons">
            <button id="slide-prev" class="button button--secondary" type="button">前へ</button>
            <button id="slide-next" class="button" type="button">次へ</button>
          </div>
        </div>
      </div>
      <div class="slide-stage" id="slide-stage">
        <div class="slide-stage__scaler" id="slide-stage-scaler">
          <div
            id="slide-frame"
            class="slide-frame"
            data-slide-frame
            data-slide-ready="false"
            data-slide-count="${slides.length}"
          >
            <div id="slide-surface" class="preview-surface slide-surface" data-slide-surface></div>
          </div>
        </div>
      </div>
    </section>
  `;

  const viewerEl = mustElement(container, '[data-slide-viewer]');
  const stageEl = mustDiv(container, '#slide-stage');
  const scalerEl = mustDiv(container, '#slide-stage-scaler');
  const frameEl = mustDiv(container, '#slide-frame');
  const surfaceEl = mustDiv(container, '#slide-surface');
  const slideCounterEl = mustElement(container, '#slide-counter');
  const slideTitleEl = mustElement(container, '#slide-title');
  const prevButton = mustButton(container, '#slide-prev');
  const nextButton = mustButton(container, '#slide-next');
  const fullscreenButton = mustButton(container, '#slide-fullscreen');
  const viewportSelect = mustSelect(container, '#slide-viewport-select');
  const supportsFullscreen = supportsFullscreenToggle(viewerEl, document);

  let disposed = false;
  fullscreenButton.hidden = !supportsFullscreen;

  const isViewerFullscreen = (): boolean => {
    const fullscreenElement = getFullscreenElement(document);
    return fullscreenElement instanceof Element && viewerEl.contains(fullscreenElement);
  };

  function syncViewportStyles(): void {
    scalerEl.style.setProperty('--slide-viewport-width', `${currentViewport.width}px`);
    scalerEl.style.setProperty('--slide-viewport-height', `${currentViewport.height}px`);
  }

  function syncStageScale(): void {
    const scale = Math.min(
      stageEl.clientWidth / currentViewport.width,
      stageEl.clientHeight / currentViewport.height,
      1,
    );
    scalerEl.style.setProperty('--slide-scale', String(Number.isFinite(scale) ? scale : 1));
  }

  function syncFullscreenState(): void {
    const fullscreen = isViewerFullscreen();
    viewerEl.dataset.fullscreen = String(fullscreen);
    fullscreenButton.textContent = fullscreen ? '全画面終了' : '全画面表示';
    fullscreenButton.setAttribute('aria-pressed', String(fullscreen));
    fullscreenButton.title = fullscreen ? '全画面表示を終了' : '全画面表示に切り替え';
  }

  function syncLocation(method: 'pushState' | 'replaceState'): void {
    const nextHref = buildSlideViewHref(options.documentHref, '', {
      view: 'slides',
      slide: currentSlideIndex + 1,
      viewportId: currentViewport.id,
    });
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (nextHref !== currentHref) {
      window.history[method]({}, '', nextHref);
    }
  }

  async function updateSlide(): Promise<void> {
    if (disposed || token !== state.renderToken) return;
    const slide = slides[currentSlideIndex];
    if (!slide) return;

    syncViewportStyles();
    frameEl.dataset.slideReady = 'false';
    frameEl.dataset.slideIndex = String(currentSlideIndex + 1);
    viewerEl.dataset.slideIndex = String(currentSlideIndex + 1);
    viewerEl.dataset.slideCount = String(slides.length);
    slideCounterEl.textContent = `Slide ${currentSlideIndex + 1} / ${slides.length}`;
    slideTitleEl.textContent = slide.title;
    prevButton.disabled = currentSlideIndex === 0;
    nextButton.disabled = currentSlideIndex >= slides.length - 1;
    viewportSelect.value = currentViewport.id;

    await renderPapyrView(surfaceEl, {
      document: slide.document,
      mode: 'slides',
      slide: currentSlideIndex + 1,
    });
    if (disposed || token !== state.renderToken) return;

    await waitForLayoutFrames();
    if (disposed || token !== state.renderToken) return;

    syncStageScale();
    frameEl.dataset.slideReady = 'true';
  }

  const goToSlide = (nextIndex: number, historyMethod: 'pushState' | 'replaceState'): void => {
    const clamped = clamp(nextIndex, 0, slides.length - 1);
    if (clamped === currentSlideIndex && historyMethod === 'pushState') return;
    currentSlideIndex = clamped;
    syncLocation(historyMethod);
    void updateSlide();
  };

  const onResize = () => {
    syncStageScale();
  };
  const onPrev = () => {
    goToSlide(currentSlideIndex - 1, 'pushState');
  };
  const onNext = () => {
    goToSlide(currentSlideIndex + 1, 'pushState');
  };
  const onViewportChange = () => {
    const nextViewport = SLIDE_VIEWPORT_PRESETS.find(
      (preset) => preset.id === viewportSelect.value,
    );
    if (!nextViewport || nextViewport.id === currentViewport.id) return;
    currentViewport = nextViewport;
    syncLocation('replaceState');
    void updateSlide();
  };
  const onFullscreenToggle = () => {
    if (!supportsFullscreen) return;
    if (isViewerFullscreen()) {
      runFullscreenAction('exit', () => exitDocumentFullscreen(document));
      return;
    }
    runFullscreenAction('enter', () => requestElementFullscreen(viewerEl));
  };
  const onFullscreenChange = () => {
    if (disposed) return;
    syncFullscreenState();
    void waitForLayoutFrames().then(() => {
      if (!disposed) syncStageScale();
    });
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

    switch (event.key) {
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        goToSlide(currentSlideIndex - 1, 'pushState');
        break;
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        event.preventDefault();
        goToSlide(currentSlideIndex + 1, 'pushState');
        break;
      case 'Home':
        event.preventDefault();
        goToSlide(0, 'pushState');
        break;
      case 'End':
        event.preventDefault();
        goToSlide(slides.length - 1, 'pushState');
        break;
      case 'Escape':
        if (isViewerFullscreen()) {
          return;
        }
        event.preventDefault();
        navigate(options.documentHref);
        break;
    }
  };

  window.addEventListener('resize', onResize);
  prevButton.addEventListener('click', onPrev);
  nextButton.addEventListener('click', onNext);
  fullscreenButton.addEventListener('click', onFullscreenToggle);
  viewportSelect.addEventListener('change', onViewportChange);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  disposePage = () => {
    disposed = true;
    window.removeEventListener('resize', onResize);
    prevButton.removeEventListener('click', onPrev);
    nextButton.removeEventListener('click', onNext);
    fullscreenButton.removeEventListener('click', onFullscreenToggle);
    viewportSelect.removeEventListener('change', onViewportChange);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  };

  syncFullscreenState();
  syncLocation('replaceState');
  await updateSlide();
}

function attachSearchFormHandler(): void {
  const form = document.querySelector<HTMLFormElement>('#site-search-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const value = input?.value ?? '';
    navigate(searchHref(value, resolveSearchSectionFilter(window.location.search)));
  });
}

async function fetchPublications(filters: PublicationFilters = {}): Promise<PublicationSummary[]> {
  const search = new URLSearchParams();
  if (filters.kind) search.set('kind', filters.kind);
  if (filters.section) search.set('section', filters.section);
  if (typeof filters.published === 'boolean') search.set('published', String(filters.published));

  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  const response = await requestJson<PublicationsListResponse>(`/api/publications${suffix}`);
  return response.items;
}

async function fetchPublication(id: string): Promise<PapyrDocument> {
  return requestJson<PapyrDocument>(`/api/publications/${encodeURIComponent(id)}`);
}

async function fetchBook(id: string): Promise<BookPayload> {
  return requestJson<BookPayload>(`/api/books/${encodeURIComponent(id)}`);
}

async function renderPreviewSafely(
  container: HTMLElement,
  doc: PapyrDocument,
  token: number,
  rawMarkdownHref?: string,
): Promise<void> {
  if (token !== state.renderToken) return;
  const mounted = await mountPapyrViewer(container, {
    document: doc,
    mode: 'document',
    suppressLeadingTitle: doc.title,
    ...(rawMarkdownHref && { loadMarkdownSource: () => requestText(rawMarkdownHref) }),
    onCopyError: (error: unknown) => {
      console.error('Failed to copy Markdown.', error);
    },
  });
  disposePage = () => mounted.dispose();
}

function markdownHref(documentHref: string): string {
  return `${documentHref.replace(/\/$/, '')}.md`;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await request(input, init);
  return (await response.json()) as T;
}

async function requestText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  const response = await request(input, init);
  return response.text();
}

async function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.ok) return response;

  let message = `${response.status} ${response.statusText}`;
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === 'string') message = data.error;
  } catch {
    // ignore non-json errors
  }
  throw new Error(message);
}

function navigate(pathAndSearch: string): void {
  window.history.pushState({}, '', pathAndSearch);
  state.route = resolveAppRoute(window.location.pathname, window.location.search);
  renderCurrentRoute();
}

function resolveDocsMarkdownPath(path: string): string {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error('Only same-origin docs paths are supported');
  }
  if (url.pathname.endsWith('.md')) {
    return `${url.pathname}${url.search}`;
  }

  const redirectTarget = resolveLlmRedirectTarget(url.pathname);
  if (!redirectTarget) {
    throw new Error('Markdown is only available for article, book, and chapter pages');
  }
  return `${redirectTarget}${url.search}`;
}

function resolveSearchSectionFilter(search: string): PublicationSection | 'all' {
  const value = new URLSearchParams(search).get('section');
  return value && isPublicationSection(value) ? value : 'all';
}

function renderCurrentRoute(): void {
  void renderApp()
    .then(() => syncScrollPosition())
    .catch((error) => {
      root.innerHTML = renderShell(state.route, renderErrorPanel(asMessage(error)), {
        immersive: shouldRenderSlidesView(state.route, window.location.search),
      });
    });
}

function syncScrollPosition(): void {
  const hash = window.location.hash;
  if (!hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }

  const element = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!element) return;

  window.requestAnimationFrame(() => {
    element.scrollIntoView({ block: 'start' });
  });
}

function shouldRenderSlidesView(route: AppRoute, search: string): boolean {
  return (
    isSlidesView(search) &&
    (route.name === 'article' || route.name === 'book' || route.name === 'chapter')
  );
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : '予期しないエラーです';
}

function mustElement(
  parent: Document | globalThis.HTMLElement,
  selector: string,
): globalThis.HTMLElement {
  const element = parent.querySelector(selector);
  if (!(element instanceof globalThis.HTMLElement)) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function mustDiv(
  parent: Document | globalThis.HTMLElement,
  selector: string,
): globalThis.HTMLDivElement {
  const element = parent.querySelector(selector);
  if (!(element instanceof globalThis.HTMLDivElement)) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function mustButton(
  parent: Document | globalThis.HTMLElement,
  selector: string,
): globalThis.HTMLButtonElement {
  const element = parent.querySelector(selector);
  if (!(element instanceof globalThis.HTMLButtonElement)) {
    throw new Error(`Missing button: ${selector}`);
  }
  return element;
}

function mustSelect(
  parent: Document | globalThis.HTMLElement,
  selector: string,
): globalThis.HTMLSelectElement {
  const element = parent.querySelector(selector);
  if (!(element instanceof globalThis.HTMLSelectElement)) {
    throw new Error(`Missing select: ${selector}`);
  }
  return element;
}

function supportsFullscreenToggle(element: HTMLElement, doc: Document): boolean {
  return canRequestElementFullscreen(element) && canExitDocumentFullscreen(doc);
}

function canRequestElementFullscreen(element: HTMLElement): boolean {
  return (
    typeof element.requestFullscreen === 'function' ||
    typeof (element as WebkitFullscreenElement).webkitRequestFullscreen === 'function'
  );
}

function canExitDocumentFullscreen(doc: Document): boolean {
  return (
    typeof doc.exitFullscreen === 'function' ||
    typeof (doc as WebkitFullscreenDocument).webkitExitFullscreen === 'function'
  );
}

function getFullscreenElement(doc: Document): Element | null {
  return doc.fullscreenElement ?? (doc as WebkitFullscreenDocument).webkitFullscreenElement ?? null;
}

function requestElementFullscreen(element: HTMLElement): Promise<void> | void {
  if (typeof element.requestFullscreen === 'function') {
    return element.requestFullscreen();
  }
  const webkitElement = element as WebkitFullscreenElement;
  return webkitElement.webkitRequestFullscreen?.();
}

function exitDocumentFullscreen(doc: Document): Promise<void> | void {
  if (typeof doc.exitFullscreen === 'function') {
    return doc.exitFullscreen();
  }
  const webkitDocument = doc as WebkitFullscreenDocument;
  return webkitDocument.webkitExitFullscreen?.();
}

function runFullscreenAction(
  action: 'enter' | 'exit',
  operation: () => Promise<void> | void,
): void {
  void Promise.resolve()
    .then(operation)
    .catch((error: unknown) => {
      console.error(`Failed to ${action} slide fullscreen mode.`, error);
    });
}

function waitForLayoutFrames(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(() => step(remaining - 1));
    };
    step(frames);
  });
}
