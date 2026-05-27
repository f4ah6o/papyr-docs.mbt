import type { PublicationSummary } from '../../shared.js';
import { escapeHtml, publicationHref } from '../../shared.js';
import {
  type LandingCard,
  countBookChapters,
  isKind,
  renderEmptyState,
  renderLandingCard,
  renderLandingCardGrid,
  renderPublicationGrid,
  renderPublicationList,
  renderRecommendedBookReadingOrder,
  toUseCaseLandingCard,
} from './components.js';

const HOME_HIGHLIGHTS = [
  {
    title: 'まず読む場所が分かる',
    summary: '入口、手順、リファレンス、更新情報を分け、読み始めの迷いを減らします。',
  },
  {
    title: 'Markdown を隠さない',
    summary: '公開ページから原文 Markdown へ戻れるので、読む人も書く人も同じ情報を確認できます。',
  },
  {
    title: '目次と検索で戻れる',
    summary: '長い book でも章目次と全文検索を残し、読み直しやすい形にします。',
  },
];

const HOME_PATTERNS: LandingCard[] = [
  {
    eyebrow: 'pattern',
    title: '入口ページで全体像を伝える',
    summary: '最初の画面で「何のためのサイトか」「誰向けか」「次に読む場所」を短く案内します。',
  },
  {
    eyebrow: 'pattern',
    title: '手順と参照情報を分ける',
    summary:
      '導入ガイドは順番に読み進められる形にし、詳細は機能別ドキュメントへ分けて迷いを減らします。',
  },
  {
    eyebrow: 'pattern',
    title: '章立てで検索しやすくする',
    summary:
      '記事、章、トピックを整理しておくと、探したい手順や背景説明に短時間でたどり着けます。',
  },
  {
    eyebrow: 'pattern',
    title: '図・表・コードで理解を助ける',
    summary:
      '文章だけでなく、コード例、図解、表を使って、説明が長くなりやすい内容を読みやすく保てます。',
  },
];

interface BookCollection {
  id: BookCollectionId;
  eyebrow: string;
  title: string;
  description: string;
  items: Array<PublicationSummary & { kind: 'book' }>;
}

interface BookCollectionDefinition extends Omit<BookCollection, 'items'> {
  id: BookCollectionId;
  order?: readonly string[];
}

type BookCollectionId =
  | 'start-here'
  | 'use-cases'
  | 'core-packages'
  | 'authoring-editing'
  | 'publishing-adapters'
  | 'unclassified-packages';

const CORE_PACKAGE_ORDER = ['core', 'markdown', 'preview', 'search', 'backend'] as const;
const AUTHORING_PACKAGE_ORDER = [
  'cli',
  'editor',
  'editor-ui',
  'vscode-extension',
  'markdown-formatter',
] as const;
const PUBLISHING_PACKAGE_ORDER = [
  'demo-cloudflare',
  'adapter-fs',
  'adapter-airtable',
  'adapter-appsheet',
  'adapter-kintone',
  'adapter-cloudflare',
  'adapter-zoho-creator',
] as const;

const CORE_PACKAGE_SLUGS = new Set(['core', 'markdown', 'preview', 'search', 'backend']);
const AUTHORING_PACKAGE_SLUGS = new Set([
  'cli',
  'editor',
  'editor-ui',
  'vscode-extension',
  'markdown-formatter',
]);
const PUBLISHING_PACKAGE_SLUGS = new Set([
  'demo-cloudflare',
  'adapter-fs',
  'adapter-airtable',
  'adapter-appsheet',
  'adapter-kintone',
  'adapter-cloudflare',
  'adapter-zoho-creator',
]);

function resolveBookCollectionId(book: PublicationSummary & { kind: 'book' }): BookCollectionId {
  switch (book.section) {
    case 'getting-started':
      return 'start-here';
    case 'use-case':
      return 'use-cases';
    case 'package':
      return resolvePackageCollectionId(book);
    case 'article':
      throw new Error(`unexpected book section for ${book.slug}`);
  }
}

function resolvePackageCollectionId(
  book: PublicationSummary & { kind: 'book' },
): BookCollectionId {
  if (CORE_PACKAGE_SLUGS.has(book.slug)) return 'core-packages';
  if (AUTHORING_PACKAGE_SLUGS.has(book.slug)) return 'authoring-editing';
  if (PUBLISHING_PACKAGE_SLUGS.has(book.slug)) return 'publishing-adapters';

  if (
    book.topics.some((topic) =>
      ['editor', 'react', 'ui', 'vscode', 'formatter', 'tiptap'].includes(topic),
    )
  ) {
    return 'authoring-editing';
  }

  if (
    book.topics.some((topic) =>
      [
        'backend',
        'adapter',
        'cloudflare',
        'demo',
        'fs',
        'airtable',
        'appsheet',
        'kintone',
        'zoho',
      ].includes(topic),
    )
  ) {
    return 'publishing-adapters';
  }

  return 'unclassified-packages';
}

function sortBookCollectionItems(
  items: Array<PublicationSummary & { kind: 'book' }>,
  order: readonly string[] = [],
): Array<PublicationSummary & { kind: 'book' }> {
  if (order.length === 0) return items;

  const orderIndex = new Map(order.map((slug, index) => [slug, index] as const));
  return [...items].sort((left, right) => {
    const leftIndex = orderIndex.get(left.slug);
    const rightIndex = orderIndex.get(right.slug);
    if (leftIndex === undefined && rightIndex === undefined) return 0;
    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
}

function buildBookCollections(
  books: Array<PublicationSummary & { kind: 'book' }>,
): BookCollection[] {
  const grouped = new Map<BookCollectionId, Array<PublicationSummary & { kind: 'book' }>>([
    ['start-here', []],
    ['use-cases', []],
    ['core-packages', []],
    ['authoring-editing', []],
    ['publishing-adapters', []],
    ['unclassified-packages', []],
  ]);

  for (const book of books) {
    grouped.get(resolveBookCollectionId(book))?.push(book);
  }

  const definitions: BookCollectionDefinition[] = [
    {
      id: 'start-here',
      eyebrow: 'start here',
      title: '最初に読む',
      description: '導入の流れを追って、Papyr の中心モデルを先に掴みます。',
    },
    {
      id: 'use-cases',
      eyebrow: 'use cases',
      title: '実例の入口',
      description: '代表的な use case だけを入口として置き、一覧は /use-cases で辿ります。',
    },
    {
      id: 'core-packages',
      eyebrow: 'core packages',
      title: '中心モデルと変換',
      description: 'PapyrDocument、Markdown 変換、preview、search など中核レイヤを参照します。',
      order: CORE_PACKAGE_ORDER,
    },
    {
      id: 'authoring-editing',
      eyebrow: 'authoring',
      title: '編集と authoring',
      description: 'CLI、editor、editor-ui、VS Code extension、formatter をまとめて辿れます。',
      order: AUTHORING_PACKAGE_ORDER,
    },
    {
      id: 'publishing-adapters',
      eyebrow: 'publishing',
      title: '公開と adapter',
      description: 'publish path と保存先 adapter、Cloudflare demo を用途別に参照します。',
      order: PUBLISHING_PACKAGE_ORDER,
    },
    {
      id: 'unclassified-packages',
      eyebrow: 'needs review',
      title: 'Unclassified packages',
      description:
        '新しい package が既存の reader-intent grouping に未分類のまま入ったときだけ表示されます。',
    },
  ];

  return definitions
    .map((definition) => ({
      ...definition,
      items: sortBookCollectionItems(
        (grouped.get(definition.id) ?? []).filter(
          (book, index, items) => items.findIndex((item) => item.id === book.id) === index,
        ),
        definition.order,
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function renderHomeBody(allPublications: PublicationSummary[]): string {
  const publications = allPublications.filter((p) => p.published);
  const articles = publications.filter(isKind('article')).slice(0, 3);
  const books = publications.filter(isKind('book'));
  const featuredUseCaseSlugs = new Set([
    'advanced-playground',
    'papyr-docs',
    'markdown-docs-pipeline',
    'cloudflare-publication-stack',
  ]);
  const useCases = books
    .filter((book) => book.section === 'use-case' && featuredUseCaseSlugs.has(book.slug))
    .slice(0, 4);
  const gettingStartedBook = books.find((book) => book.slug === 'getting-started') ?? null;
  const featuredDocs = books.filter((book) => book.section === 'package').slice(0, 4);
  const gettingStartedHref = gettingStartedBook ? publicationHref(gettingStartedBook) : '/books';
  const gettingStartedLabel = gettingStartedBook ? '導入ガイドを見る' : 'ドキュメントを開く';
  const nextSteps: LandingCard[] = [
    {
      eyebrow: 'start',
      title: gettingStartedBook?.title ?? '導入ガイド',
      summary:
        gettingStartedBook?.summary ??
        'Papyr を最短で理解するための入口です。導入の流れと最初のドキュメント作成まで順番に追えます。',
      link: {
        href: gettingStartedHref,
        label: gettingStartedLabel,
        dataLink: true,
      },
    },
    {
      eyebrow: 'try',
      title: '編集体験を試す',
      summary:
        'Playground で Markdown、編集 UI、プレビューを並べて確認しながら、実際の使い心地をそのまま試せます。',
      link: {
        href: '/playground',
        label: 'Playground を開く',
        dataLink: true,
      },
    },
    {
      eyebrow: 'docs',
      title: 'ガイドとリファレンスを見る',
      summary:
        '必要な機能や use case から詳しく読みたい場合は、ガイドと API リファレンスへ直接進めます。',
      link: {
        href: '/books',
        label: 'ドキュメント一覧へ',
        dataLink: true,
      },
    },
  ];

  return `
    <section class="hero hero--landing">
      <div class="hero__body">
        <p class="eyebrow">documentation site foundation</p>
        <h1>Papyr は、Markdown から育てるドキュメントサイトの土台です。</h1>
        <p class="hero__lead">
          原稿は Markdown のまま扱い、公開側では目次、検索、raw Markdown、slide view をまとめて提供します。
          読む人が今いる場所を見失わない docs site を作るための実装例です。
        </p>
        <div class="hero__actions">
          <a class="button" data-link href="${gettingStartedHref}">${gettingStartedLabel}</a>
          <a class="button button--secondary" data-link href="/use-cases">Use Cases を見る</a>
          <a class="button button--secondary" data-link href="/playground">編集体験を試す</a>
        </div>
      </div>
      <ul class="hero-highlights">
        ${HOME_HIGHLIGHTS.map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.summary)}</span>
            </li>
          `,
        ).join('')}
      </ul>
    </section>

    <section class="section" id="use-cases">
      <div class="section__header">
        <div>
          <p class="eyebrow">use cases</p>
          <h2>実例から読む</h2>
          <p class="section__description">
            公開、authoring、Cloudflare 配信など、複数 package を組み合わせる場面から先に辿れます。
          </p>
        </div>
        <a data-link href="/use-cases">一覧を見る</a>
      </div>
      ${renderLandingCardGrid(useCases.map(toUseCaseLandingCard))}
    </section>

    <section class="section" id="patterns">
      <div class="section__header">
        <div>
          <p class="eyebrow">patterns</p>
          <h2>読みやすく保つための型</h2>
          <p class="section__description">
            入口、章立て、検索、Markdown 導線をそろえて、長いドキュメントでも戻りやすくします。
          </p>
        </div>
      </div>
      ${renderLandingCardGrid(HOME_PATTERNS)}
    </section>

    <section class="section" id="getting-started">
      <div class="section__header">
        <div>
          <p class="eyebrow">getting started</p>
          <h2>次にやることを選べます</h2>
          <p class="section__description">
            初めて触る人向けの導線を 3 つに絞り、読む・試す・詳しく調べるのどれからでも始められます。
          </p>
        </div>
      </div>
      ${renderLandingCardGrid(nextSteps)}
    </section>

    <section class="section">
      <div class="section__header">
        <div>
          <p class="eyebrow">docs</p>
          <h2>機能別ドキュメント</h2>
          <p class="section__description">
            詳しく知りたいときは、最初に読むものと package ごとのリファレンスを分けて辿れます。
          </p>
        </div>
        <a data-link href="/books">一覧を見る</a>
      </div>
      ${
        featuredDocs.length > 0
          ? renderPublicationGrid(
              featuredDocs,
              (book) => `${countBookChapters(publications, book.id)} chapters`,
            )
          : renderEmptyState('公開済み book はまだありません。')
      }
    </section>

    <section class="section">
      <div class="section__header">
        <div>
          <p class="eyebrow">updates</p>
          <h2>最新の更新情報</h2>
          <p class="section__description">
            リリースや公開内容の変化を追いたいときは、ここから最新の記事を確認できます。
          </p>
        </div>
        <a data-link href="/articles">すべて見る</a>
      </div>
      ${
        articles.length > 0
          ? renderPublicationList(articles)
          : renderEmptyState('まだ article はありません。')
      }
    </section>
  `;
}

export function renderUseCasesBody(publications: PublicationSummary[]): string {
  // chapter count は全 publication が必要なので filter は内部で行う
  const useCases = publications.filter(
    (p): p is PublicationSummary & { kind: 'book' } =>
      p.kind === 'book' && p.published && p.section === 'use-case',
  );
  return `
    <section class="hero hero--compact">
      <div class="hero__body">
        <p class="eyebrow">use cases</p>
        <h1>実例から Papyr の使い方を辿る</h1>
        <p class="hero__lead">
          構成の考え方、公開導線、関連 package へのつながりを、順序のある walkthrough として読めます。
        </p>
      </div>
    </section>
    <section class="section">
      ${
        useCases.length > 0
          ? renderPublicationGrid(
              useCases,
              (book) => `${countBookChapters(publications, book.id)} chapters`,
            )
          : renderEmptyState('公開済み use case はまだありません。')
      }
    </section>
  `;
}

export function renderArticlesBody(publications: PublicationSummary[]): string {
  const articles = publications.filter(
    (p): p is PublicationSummary & { kind: 'article' } =>
      p.kind === 'article' && p.published,
  );
  return `
    <section class="hero hero--compact">
      <div class="hero__body">
        <p class="eyebrow">articles</p>
        <h1>リリースノート / ブログ</h1>
        <p class="hero__lead">公開済み article を新しい順に表示します。</p>
      </div>
    </section>
    <section class="section">
      ${
        articles.length > 0
          ? renderPublicationList(articles)
          : renderEmptyState('公開済み article はまだありません。')
      }
    </section>
  `;
}

export function renderBooksBody(publications: PublicationSummary[]): string {
  const books = publications.filter(
    (p): p is PublicationSummary & { kind: 'book' } => p.kind === 'book' && p.published,
  );
  const sections = buildBookCollections(books);
  const fullUseCaseCount = books.filter((book) => book.section === 'use-case').length;
  return `
    <section class="hero hero--compact">
      <div>
        <p class="eyebrow">books</p>
        <h1>読む順番で辿る docs</h1>
        <p class="hero__lead">
          Getting Started、代表 use case、package docs の順に並べ、詳しい use case 一覧は専用ページへ分けています。
        </p>
      </div>
    </section>
    ${renderRecommendedBookReadingOrder(books)}
    ${sections
      .map(
        (section) => `
          <section class="section">
            <div class="section__header">
              <div>
                <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
                <h2>${escapeHtml(section.title)}</h2>
                <p class="section__description">${escapeHtml(section.description)}</p>
              </div>
              ${
                section.id === 'use-cases'
                  ? `<a data-link href="/use-cases">Use Cases 全 ${fullUseCaseCount} 件を見る</a>`
                  : ''
              }
            </div>
            ${
              section.id === 'use-cases'
                ? renderUseCaseGateway(section.items, publications, fullUseCaseCount)
                : section.items.length > 0
                  ? renderPublicationGrid(
                      section.items,
                      (book) => `${countBookChapters(publications, book.id)} chapters`,
                    )
                  : renderEmptyState('該当する docs はまだありません。')
            }
          </section>
        `,
      )
      .join('')}
  `;
}

function renderUseCaseGateway(
  items: Array<PublicationSummary & { kind: 'book' }>,
  publications: PublicationSummary[],
  fullUseCaseCount: number,
): string {
  if (items.length === 0) return renderEmptyState('公開済み use case はまだありません。');
  const primary = items[0]!;
  const rest = items.slice(1);
  return `
    <div class="card-grid info-grid">
      ${renderLandingCard({
        eyebrow: 'use-case index',
        title: '/use-cases で実例を選ぶ',
        summary: `${fullUseCaseCount} 件の use case を、用途別の一覧ページで確認できます。/books では読む順番を保つため代表例だけを置いています。`,
        link: { href: '/use-cases', label: '一覧を見る', dataLink: true },
      })}
      ${renderLandingCard({
        eyebrow: 'recommended',
        title: primary.title,
        summary: primary.summary,
        link: {
          href: publicationHref(primary),
          label: `${countBookChapters(publications, primary.id)} chapters`,
          dataLink: true,
        },
      })}
      ${rest.slice(0, 2).map((book) =>
        renderLandingCard({
          eyebrow: 'example',
          title: book.title,
          summary: book.summary,
          link: {
            href: publicationHref(book),
            label: `${countBookChapters(publications, book.id)} chapters`,
            dataLink: true,
          },
        }),
      ).join('')}
    </div>
  `;
}
