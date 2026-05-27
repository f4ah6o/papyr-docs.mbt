import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderArticlesBody,
  renderBooksBody,
  renderHomeBody,
  renderNotFoundPanel,
  renderShell,
  renderUseCasesBody,
} from '../src/client/render/index.js';
import { resolveAppRoute, type DocumentManifest, type PublicationSummary } from '../src/shared.js';

const appRoot = resolve(fileURLToPath(import.meta.url), '../..');
const distDir = resolve(appRoot, 'dist/client');
const dataDir = resolve(distDir, '__papyr_docs_data');
const staticRoutesDir = resolve(appRoot, 'dist/content/static-routes');
const templatePath = resolve(distDir, 'index.html');

interface PrerenderRoute {
  pathname: string;
  title: string;
  description: string;
  required: boolean;
  build: (publications: PublicationSummary[]) => string;
}

interface MoonBitStaticRoute {
  pathname: string;
  title: string;
  description: string;
  artifactPath: string;
}

const SITE_TITLE = 'Papyr docs';
const SITE_DESCRIPTION = 'Papyr は、構造化されたドキュメントサイトを育てるための土台です。';

const ROUTES: PrerenderRoute[] = [
  {
    pathname: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    required: true,
    build: renderHomeBody,
  },
  {
    pathname: '/use-cases',
    title: `Use Cases | ${SITE_TITLE}`,
    description: '実例から Papyr の使い方を辿る walkthrough 一覧。',
    required: true,
    build: renderUseCasesBody,
  },
  {
    pathname: '/articles',
    title: `Articles | ${SITE_TITLE}`,
    description: '公開済み article（リリースノート / ブログ）一覧。',
    required: true,
    build: renderArticlesBody,
  },
  {
    pathname: '/books',
    title: `Books | ${SITE_TITLE}`,
    description: '導入ガイド / use case / package docs の一覧。',
    required: true,
    build: renderBooksBody,
  },
];

const FALLBACK_SHELLS: Array<{ pathname: string; title: string; description: string }> = [
  {
    pathname: '/playground',
    title: `Playground | ${SITE_TITLE}`,
    description: 'Markdown / 編集 UI / プレビューを並べて試せる Playground。',
  },
  {
    pathname: '/design-system',
    title: `Design System | ${SITE_TITLE}`,
    description:
      'Papyr の editor / viewer / slide viewer と docs UI pattern を確認する簡易デザインシステム。',
  },
  {
    pathname: '/advanced-playground',
    title: `Advanced Playground | ${SITE_TITLE}`,
    description: '詳細な編集体験を確認できる advanced playground。',
  },
  {
    pathname: '/search',
    title: `Search | ${SITE_TITLE}`,
    description: 'ドキュメント横断検索。',
  },
];

async function main(): Promise<void> {
  const [template, manifest, staticRoutes] = await Promise.all([
    readFile(templatePath, 'utf8'),
    loadManifest(),
    loadMoonBitStaticRoutes(),
  ]);
  const written = new Set<string>();

  for (const route of ROUTES) {
    try {
      const staticRoute = staticRoutes.get(route.pathname);
      const html = staticRoute
        ? await renderMoonBitRoute(template, staticRoute)
        : renderRoute(template, route, manifest.publications);
      await writeRouteHtml(route.pathname, html);
      written.add(route.pathname);
      console.log(`prerendered ${route.pathname}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (route.required) {
        throw new Error(`prerender failed for ${route.pathname}: ${message}`);
      }
      console.warn(`prerender skipped ${route.pathname}: ${message}`);
    }
  }

  for (const staticRoute of staticRoutes.values()) {
    if (written.has(staticRoute.pathname)) continue;
    try {
      const html = await renderMoonBitRoute(template, staticRoute);
      await writeRouteHtml(staticRoute.pathname, html);
      written.add(staticRoute.pathname);
      console.log(`prerendered MoonBit route ${staticRoute.pathname}`);
    } catch (error) {
      console.warn(
        `MoonBit route prerender skipped ${staticRoute.pathname}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (const shell of FALLBACK_SHELLS) {
    try {
      const route = resolveAppRoute(shell.pathname, '');
      const body = shell.pathname === '/search' ? '' : '';
      const html = injectShell(template, {
        title: shell.title,
        description: shell.description,
        body: renderShell(route, body, { hash: '' }),
      });
      await writeRouteHtml(shell.pathname, html);
      console.log(`prerendered shell ${shell.pathname}`);
    } catch (error) {
      console.warn(
        `shell prerender skipped ${shell.pathname}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // 404 page
  try {
    const route = resolveAppRoute('/404', '');
    const body = renderShell(route, renderNotFoundPanel(), { hash: '' });
    const html = injectShell(template, {
      title: `Not found | ${SITE_TITLE}`,
      description: 'ページが見つかりません。',
      body,
    });
    await writeFile(resolve(distDir, '404.html'), html, 'utf8');
    console.log('prerendered 404.html');
  } catch (error) {
    console.warn(`404 prerender failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  await writeStaticArtifacts(manifest);
}

async function loadManifest(): Promise<DocumentManifest> {
  const path = resolve(dataDir, 'manifest.json');
  const source = await readFile(path, 'utf8');
  return JSON.parse(source) as DocumentManifest;
}

async function loadMoonBitStaticRoutes(): Promise<Map<string, MoonBitStaticRoute>> {
  const path = resolve(staticRoutesDir, 'routes.json');
  try {
    const source = await readFile(path, 'utf8');
    const parsed = JSON.parse(source) as { routes?: MoonBitStaticRoute[] };
    const routes = new Map<string, MoonBitStaticRoute>();
    for (const route of parsed.routes ?? []) {
      if (!route.pathname || !route.artifactPath) continue;
      routes.set(route.pathname, route);
    }
    return routes;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 'ENOENT') return new Map();
    throw error;
  }
}

function renderRoute(
  template: string,
  route: PrerenderRoute,
  publications: PublicationSummary[],
): string {
  const appRoute = resolveAppRoute(route.pathname, '');
  const body = renderShell(appRoute, route.build(publications), { hash: '' });
  return injectShell(template, {
    title: route.title,
    description: route.description,
    body,
  });
}

async function renderMoonBitRoute(template: string, route: MoonBitStaticRoute): Promise<string> {
  const bodyPath = resolve(appRoot, 'dist/content', route.artifactPath);
  const body = await readFile(bodyPath, 'utf8');
  const appRoute = resolveAppRoute(route.pathname, '');
  return injectShell(template, {
    title: route.title,
    description: route.description,
    body: renderShell(appRoute, body, { hash: '' }),
  });
}

function injectShell(
  template: string,
  options: { title: string; description: string; body: string },
): string {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(options.title)}</title>`);
  html = ensureMetaTag(html, 'description', options.description);
  // Vite 出力テンプレートは `<div id="app"></div>` を空のまま返す。中身がある場合は
  // Vite 設定が変わったサインなので、サイレントに差し替えず明示的に失敗させる。
  if (!html.includes('<div id="app"></div>')) {
    throw new Error('index.html template no longer contains an empty <div id="app"></div>');
  }
  html = html.replace('<div id="app"></div>', `<div id="app">${options.body}</div>`);
  return html;
}

function ensureMetaTag(html: string, name: string, content: string): string {
  const metaRegex = new RegExp(`<meta\\s+name="${name}"[^>]*>`);
  const replacement = `<meta name="${name}" content="${escapeAttr(content)}" />`;
  if (metaRegex.test(html)) {
    return html.replace(metaRegex, replacement);
  }
  return html.replace(/<\/head>/, `  ${replacement}\n  </head>`);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function writeRouteHtml(pathname: string, html: string): Promise<void> {
  const target =
    pathname === '/'
      ? resolve(distDir, 'index.html')
      : resolve(distDir, pathname.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

async function writeStaticArtifacts(manifest: DocumentManifest): Promise<void> {
  const origin = process.env.PAPYR_DOCS_ORIGIN ?? 'https://docs.papyr.f12o.dev';
  const sitemap = buildSitemap(origin, manifest);
  const robots = buildRobots(origin);
  const llms = buildLlmsTxt(origin, manifest);

  await Promise.all([
    writeFile(resolve(distDir, 'sitemap.xml'), sitemap, 'utf8'),
    writeFile(resolve(distDir, 'robots.txt'), robots, 'utf8'),
    writeFile(resolve(distDir, 'llms.txt'), llms, 'utf8'),
  ]);
  console.log('wrote sitemap.xml / robots.txt / llms.txt');
}

const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value.slice(0, 10);
  if (!ISO_DATE_RE.test(date)) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const [y, m, d] = date.split('-').map(Number);
  return parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() + 1 === m &&
    parsed.getUTCDate() === d
    ? date
    : undefined;
}

function buildSitemap(origin: string, manifest: DocumentManifest): string {
  const published = manifest.publications.filter((p) => p.published);
  const articles = published.filter((p) => p.kind === 'article');
  const books = published.filter((p) => p.kind === 'book');
  const chapters = published.filter((p) => p.kind === 'chapter');

  const entries: string[] = [];
  const addUrl = (loc: string, lastmod?: string) => {
    const date = toIsoDate(lastmod);
    const lastmodTag = date ? `\n    <lastmod>${date}</lastmod>` : '';
    entries.push(`  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`);
  };

  addUrl(`${origin}/`);
  addUrl(`${origin}/articles`);
  for (const article of articles) {
    addUrl(`${origin}/articles/${encodeURIComponent(article.slug)}`, article.updatedAt);
  }
  addUrl(`${origin}/books`);
  for (const book of books) {
    addUrl(`${origin}/books/${encodeURIComponent(book.slug)}`, book.updatedAt);
    const chapterIds = manifest.books[book.id]?.chapterIds ?? [];
    for (const chapterId of chapterIds) {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) continue;
      addUrl(
        `${origin}/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`,
        chapter.updatedAt,
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobots(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

function mdLinkText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/]/g, '\\]').replace(/\n/g, ' ');
}

function mdOneLine(value: string): string {
  return value.replace(/\n/g, ' ');
}

function buildLlmsTxt(origin: string, manifest: DocumentManifest): string {
  const published = manifest.publications.filter((p) => p.published);
  const articles = published.filter((p) => p.kind === 'article');
  const books = published.filter((p) => p.kind === 'book');
  const chapters = published.filter((p) => p.kind === 'chapter');

  const lines: string[] = [
    '# Papyr Docs',
    '',
    '> headless Markdown publishing toolkit for TypeScript',
    '',
  ];

  if (articles.length > 0) {
    lines.push('## Articles', '');
    for (const article of articles) {
      lines.push(
        `- [${mdLinkText(article.title)}](${origin}/articles/${encodeURIComponent(article.slug)}.md): ${mdOneLine(article.summary)}`,
      );
    }
    lines.push('');
  }

  for (const book of books) {
    lines.push(`## ${mdOneLine(book.title)}`, '');
    lines.push(
      `- [${mdLinkText(book.title)} (overview)](${origin}/books/${encodeURIComponent(book.slug)}.md): ${mdOneLine(book.summary)}`,
    );
    const chapterIds = manifest.books[book.id]?.chapterIds ?? [];
    for (const chapterId of chapterIds) {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) continue;
      lines.push(
        `- [${mdLinkText(chapter.title)}](${origin}/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}.md): ${mdOneLine(chapter.summary)}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
