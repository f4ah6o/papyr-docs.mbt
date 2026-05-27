import type { PapyrDocument } from '@f12o/papyr-core';
import type { PublicationKind, PublicationSection, PublicationSummary } from '../../shared.js';
import {
  chapterHref,
  escapeHtml,
  getPublicationMeta,
  publicationHref,
} from '../../shared.js';
import { buildSlideViewHref } from '../../slides.js';

export interface LandingCardLink {
  href: string;
  label: string;
  dataLink?: boolean;
}

export interface LandingCard {
  eyebrow: string;
  title: string;
  summary: string;
  link?: LandingCardLink;
}

export function fallbackEmoji(kind: PublicationKind): string {
  switch (kind) {
    case 'article':
      return '📝';
    case 'book':
      return '📘';
    case 'chapter':
      return '📄';
  }
}

export function formatSectionLabel(section: PublicationSection): string {
  switch (section) {
    case 'getting-started':
      return 'Getting Started';
    case 'use-case':
      return 'Use Case';
    case 'package':
      return 'Package';
    case 'article':
      return 'Article';
    default:
      section satisfies never;
      return String(section as string);
  }
}

export function formatUpdatedAt(value?: string): string {
  if (!value) return 'Draft';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function countBookChapters(items: PublicationSummary[], bookId: string): number {
  return items.filter((item) => item.kind === 'chapter' && item.bookId === bookId).length;
}

export function isKind<K extends PublicationKind>(kind: K) {
  return (summary: PublicationSummary): summary is PublicationSummary & { kind: K } =>
    summary.kind === kind;
}

export function renderLoadingPanel(): string {
  return `<section class="panel"><p>読み込み中...</p></section>`;
}

export function renderErrorPanel(message: string): string {
  return `<section class="panel panel--error"><h1>エラー</h1><p>${escapeHtml(message)}</p></section>`;
}

export function renderNotFoundPanel(message = 'ページが見つかりません。'): string {
  return `<section class="panel"><h1>Not found</h1><p>${escapeHtml(message)}</p></section>`;
}

export function renderEmptyState(message: string): string {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function renderTopics(topics: string[]): string {
  if (topics.length === 0) return '';
  return `<div class="topic-row">${topics
    .map((topic) => `<span class="topic-chip">${escapeHtml(topic)}</span>`)
    .join('')}</div>`;
}

export function renderDocumentModeActions(documentHref: string): string {
  const slideHref = buildSlideViewHref(documentHref, '', { view: 'slides' });
  return `
    <div class="article-header__actions">
      <a class="button button--secondary" data-link href="${slideHref}">Slide view</a>
    </div>
  `;
}

export function renderPublicationCard(
  summary: PublicationSummary & { kind: 'article' | 'book' },
  metaText?: string,
): string {
  return `
    <article class="publication-card">
      <a data-link href="${publicationHref(summary)}" class="publication-card__link">
        <div class="publication-card__header">
          <span class="publication-card__emoji">${escapeHtml(summary.emoji ?? fallbackEmoji(summary.kind))}</span>
          <span class="publication-card__kind">${escapeHtml(formatSectionLabel(summary.section))}</span>
        </div>
        <h3>${escapeHtml(summary.title)}</h3>
        <p class="publication-card__summary">${escapeHtml(summary.summary)}</p>
        <div class="meta-row">
          <span>${escapeHtml(summary.slug)}</span>
          <span>${escapeHtml(metaText ?? formatUpdatedAt(summary.updatedAt))}</span>
        </div>
        ${renderTopics(summary.topics)}
      </a>
    </article>
  `;
}

export function renderPublicationListItem(
  summary: PublicationSummary & { kind: 'article' | 'book' },
  metaText?: string,
): string {
  return `
    <li class="publication-list__item">
      <a data-link href="${publicationHref(summary)}">
        <div class="publication-list__header">
          <span class="publication-card__emoji">${escapeHtml(summary.emoji ?? fallbackEmoji(summary.kind))}</span>
          <p class="eyebrow">${escapeHtml(formatSectionLabel(summary.section))}</p>
        </div>
        <h3>${escapeHtml(summary.title)}</h3>
        <p class="publication-list__summary">${escapeHtml(summary.summary)}</p>
        <div class="meta-row">
          <span>${escapeHtml(summary.slug)}</span>
          <span>${escapeHtml(metaText ?? formatUpdatedAt(summary.updatedAt))}</span>
        </div>
        ${renderTopics(summary.topics)}
      </a>
    </li>
  `;
}

export function renderPublicationGrid(
  items: Array<PublicationSummary & { kind: 'article' | 'book' }>,
  meta?: (summary: PublicationSummary & { kind: 'article' | 'book' }) => string,
): string {
  return `
    <div class="card-grid">
      ${items.map((item) => renderPublicationCard(item, meta?.(item))).join('')}
    </div>
  `;
}

export function renderPublicationList(
  items: Array<PublicationSummary & { kind: 'article' | 'book' }>,
  meta?: (summary: PublicationSummary & { kind: 'article' | 'book' }) => string,
): string {
  return `
    <ol class="publication-list">
      ${items.map((item) => renderPublicationListItem(item, meta?.(item))).join('')}
    </ol>
  `;
}

export function renderLandingCard(item: LandingCard): string {
  const content = `
    <div class="info-card__body">
      <p class="eyebrow">${escapeHtml(item.eyebrow)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="info-card__summary">${escapeHtml(item.summary)}</p>
    </div>
    ${
      item.link
        ? `<div class="info-card__footer">${escapeHtml(item.link.label)} <span aria-hidden="true">→</span></div>`
        : ''
    }
  `;

  return `
    <article class="info-card">
      ${
        item.link
          ? `<a class="info-card__link"${item.link.dataLink ? ' data-link' : ''} href="${escapeHtml(item.link.href)}">${content}</a>`
          : content
      }
    </article>
  `;
}

export function renderLandingCardGrid(items: LandingCard[]): string {
  return `
    <div class="card-grid info-grid">
      ${items.map((item) => renderLandingCard(item)).join('')}
    </div>
  `;
}

export function renderChapterLink(
  book: PublicationSummary,
  chapterDoc: PapyrDocument,
  activeChapterId?: string,
): string {
  const chapter = getPublicationMeta(chapterDoc);
  if (chapter?.kind !== 'chapter') return '';

  return `
    <li>
      <a data-link href="${chapterHref(book.slug, chapter.slug)}" class="chapter-link ${
        activeChapterId === chapterDoc.id ? 'active' : ''
      }">
        <span>${chapter.chapterOrder}. ${escapeHtml(chapterDoc.title ?? chapterDoc.id)}</span>
        <small>${escapeHtml(chapter.summary)}</small>
      </a>
    </li>
  `;
}

export function summaryHref(
  summary: PublicationSummary,
  publications: PublicationSummary[],
): string | null {
  if (summary.kind === 'article' || summary.kind === 'book') {
    return publicationHref({ kind: summary.kind, slug: summary.slug });
  }
  if (summary.kind === 'chapter') {
    const book = publications.find(
      (item): item is PublicationSummary & { kind: 'book' } =>
        item.kind === 'book' && item.id === summary.bookId,
    );
    if (!book) return null;
    return chapterHref(book.slug, summary.slug);
  }
  return null;
}

export function resolveParentBookTitle(
  summary: PublicationSummary,
  publications: PublicationSummary[],
): string | null {
  if (summary.kind !== 'chapter' || !summary.bookId) return null;
  const book = publications.find((item) => item.kind === 'book' && item.id === summary.bookId);
  return book?.title ?? null;
}

function adjacentPackageSlugs(slug: string): string[] {
  switch (slug) {
    case 'core':
      return ['markdown', 'preview', 'search'];
    case 'markdown':
      return ['core', 'markdown-formatter', 'preview'];
    case 'preview':
      return ['markdown', 'editor-ui', 'search'];
    case 'search':
      return ['core', 'preview', 'demo-cloudflare'];
    case 'editor':
      return ['editor-ui', 'markdown'];
    case 'editor-ui':
      return ['editor', 'preview', 'vscode-extension'];
    case 'demo-cloudflare':
      return ['adapter-cloudflare', 'search', 'preview'];
    default:
      return ['core', 'markdown', 'preview'];
  }
}

function recommendNextSteps(
  summary: PublicationSummary,
  publications: PublicationSummary[],
): Array<{ href: string; title: string; summary: string }> {
  const books = publications.filter(isKind('book'));
  const bySlug = new Map(books.map((book) => [book.slug, book] as const));
  const recommendations: Array<PublicationSummary> = [];

  if (summary.kind === 'chapter' && summary.bookId) {
    const book = books.find((item) => item.id === summary.bookId);
    if (book) recommendations.push(book);
  } else if (summary.section === 'getting-started') {
    for (const slug of ['core', 'markdown', 'preview']) {
      const book = bySlug.get(slug);
      if (book) recommendations.push(book);
    }
  } else if (summary.section === 'use-case') {
    for (const slug of ['getting-started', 'core', 'markdown', 'editor-ui', 'adapter-cloudflare']) {
      const book = bySlug.get(slug);
      if (book) recommendations.push(book);
    }
    const introArticle = publications.find(
      (item): item is PublicationSummary & { kind: 'article' } =>
        item.kind === 'article' && item.slug === 'introducing-papyr-docs',
    );
    if (introArticle) recommendations.push(introArticle);
  } else if (summary.section === 'article') {
    const target =
      summary.slug === 'introducing-papyr-docs'
        ? bySlug.get('papyr-docs')
        : bySlug.get('getting-started');
    if (target) recommendations.push(target);
  } else if (summary.kind === 'book') {
    for (const slug of adjacentPackageSlugs(summary.slug)) {
      const book = bySlug.get(slug);
      if (book) recommendations.push(book);
    }
    const gettingStarted = bySlug.get('getting-started');
    if (gettingStarted && summary.slug !== 'getting-started')
      recommendations.unshift(gettingStarted);
  }

  return recommendations
    .filter((item) => item.id !== summary.id)
    .filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 4)
    .map((item) => ({
      href:
        summaryHref(item, publications) ??
        publicationHref(item as PublicationSummary & { kind: 'article' | 'book' }),
      title: item.title,
      summary: item.summary,
    }))
    .filter((item) => Boolean(item.href));
}

export function renderRecommendedNextSteps(
  summary: PublicationSummary,
  publications: PublicationSummary[],
): string {
  const items = recommendNextSteps(summary, publications);
  if (items.length === 0) return '';
  return `
    <section class="panel recommendation-panel">
      <p class="eyebrow">next</p>
      <h2>次に読む</h2>
      <div class="recommendation-list">
        ${items
          .map(
            (item) => `
              <a class="recommendation-link" data-link href="${item.href}">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.summary)}</span>
              </a>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderReadingOrderChip(book?: PublicationSummary & { kind: 'book' }): string {
  if (!book) return '';
  return `<a class="reading-order-chip" data-link href="${publicationHref(book)}">${escapeHtml(book.title)}</a>`;
}

export function renderRecommendedBookReadingOrder(
  books: Array<PublicationSummary & { kind: 'book' }>,
): string {
  const bySlug = new Map(books.map((book) => [book.slug, book] as const));
  const steps = [
    {
      eyebrow: 'step 1',
      title: 'core と markdown から始める',
      summary:
        'PapyrDocument と Markdown 変換の基礎を先に押さえると、他の package の役割が追いやすくなります。',
      slugs: ['core', 'markdown'],
    },
    {
      eyebrow: 'step 2',
      title: 'CLI / formatter / editor-ui を足す',
      summary:
        '変換フロー、整形、headless editor layer、編集 UI など、実際の authoring 作業に近い layer を次の段階で追加します。',
      slugs: ['cli', 'markdown-formatter', 'editor', 'editor-ui'],
    },
    {
      eyebrow: 'step 3',
      title: 'backend と adapter は必要になってから読む',
      summary:
        '保存先や公開構成は用途依存なので、全体像を掴んだあとで backend と adapter 群へ進むのが分かりやすいです。',
      slugs: ['backend', 'adapter-fs', 'adapter-cloudflare', 'demo-cloudflare'],
    },
  ] satisfies Array<{
    eyebrow: string;
    title: string;
    summary: string;
    slugs: string[];
  }>;

  return `
    <section class="section">
      <div class="section__header">
        <div>
          <p class="eyebrow">recommended order</p>
          <h2>おすすめの読み順</h2>
          <p class="section__description">
            初見ならこの順番で読むと、中心モデルから周辺 package まで段階的に追えます。
          </p>
        </div>
      </div>
      <div class="panel recommendation-panel">
        <div class="recommendation-list">
          ${steps
            .map(
              (step) => `
                <div class="recommendation-link reading-order-card">
                  <p class="eyebrow">${escapeHtml(step.eyebrow)}</p>
                  <strong>${escapeHtml(step.title)}</strong>
                  <span>${escapeHtml(step.summary)}</span>
                  <div class="reading-order-links">
                    ${step.slugs
                      .map((slug) => renderReadingOrderChip(bySlug.get(slug)))
                      .filter((item) => item.length > 0)
                      .join('')}
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function toUseCaseLandingCard(
  summary: PublicationSummary & { kind: 'book' },
): LandingCard {
  return {
    eyebrow: 'use case',
    title: summary.title,
    summary: summary.summary,
    link: {
      href: publicationHref(summary),
      label: 'この use case を開く',
      dataLink: true,
    },
  };
}
