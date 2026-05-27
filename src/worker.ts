import { parseDocument, type PapyrDocument } from '@f12o/papyr-core';
import type { BookPayload, DocumentManifest, PublicationSummary } from './shared.js';
import {
  findChapterBySlugs,
  findPublicationBySlug,
  filterPublicationSummaries,
  isLlmUserAgent,
  isPublicationSection,
  resolveLlmRedirectTarget,
  resolveRawMarkdownRoute,
  type PublicationKind,
  type PublicationSection,
} from './shared.js';

export interface R2Body {
  text(): Promise<string>;
}

export interface R2Binding {
  get(key: string): Promise<R2Body | null>;
}

export interface AssetBinding {
  fetch(input: Request | URL | string): Promise<Response>;
}

export type ContentSource = 'assets' | 'r2';

export interface Env {
  PAPYR_DOCS_R2: R2Binding;
  ASSETS: AssetBinding;
  PAPYR_DOCS_CONTENT_SOURCE?: ContentSource;
}

const PUBLICATIONS_ROUTE = '/api/publications';
const BOOKS_ROUTE = '/api/books';
const MANIFEST_KEY = 'papyr-docs/manifest.json';
const BOOK_KEY_PREFIX = 'papyr-docs/books/';
const DOC_KEY_PREFIX = 'papyr-docs/docs/';
const RAW_KEY_PREFIX = 'papyr-docs/raw/';
const ASSET_FETCH_ORIGIN = 'https://papyr.f12o.local';
const ASSET_DATA_PREFIX = '/__papyr_docs_data/';
const CACHE_SHORT = 'public, max-age=300';
const CACHE_HOURLY = 'public, max-age=3600';
const CACHE_DAILY = 'public, max-age=86400';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === PUBLICATIONS_ROUTE) {
    return listPublications(url, env);
  }

  if (request.method === 'GET' && url.pathname.startsWith(`${BOOKS_ROUTE}/`)) {
    return getBook(env, decodeResourceId(url.pathname, BOOKS_ROUTE));
  }

  if (request.method === 'GET' && url.pathname.startsWith(`${PUBLICATIONS_ROUTE}/`)) {
    return getPublication(env, decodeResourceId(url.pathname, PUBLICATIONS_ROUTE));
  }

  if (request.method === 'GET') {
    const staticSeoResponse = await getStaticSeoAsset(url.pathname, request, env);
    if (staticSeoResponse) return staticSeoResponse;
  }

  if (request.method === 'GET') {
    const rawResponse = await getRawMarkdown(url.pathname, env);
    if (rawResponse) return rawResponse;
  }

  if (request.method === 'GET') {
    const target = resolveLlmRedirectTarget(url.pathname);
    if (target && isLlmUserAgent(request.headers.get('user-agent'))) {
      return Response.redirect(`${url.origin}${target}${url.search}`, 302);
    }
  }

  if (url.pathname.startsWith('/api/')) {
    return error(404, 'ルートが見つかりません');
  }

  return env.ASSETS.fetch(request);
}

async function listPublications(url: URL, env: Env): Promise<Response> {
  const filters = parsePublicationFilters(url);
  if (typeof filters === 'string') return error(400, filters);

  const manifest = await loadManifest(env);
  if (!manifest) return error(500, 'manifest が見つかりません');

  return json({
    items: filterPublicationSummaries(manifest.publications, filters),
  }, 200, CACHE_SHORT);
}

async function getBook(env: Env, id: string | null): Promise<Response> {
  if (!id) return error(404, 'book が見つかりません');

  const manifest = await loadManifest(env);
  if (!manifest) return error(500, 'manifest が見つかりません');

  const summary = manifest.publications.find((item) => item.id === id);
  if (!summary || summary.kind !== 'book') return error(404, 'book が見つかりません');

  const payload = await loadBookPayload(env, id);
  if (!payload) return error(500, 'book payload が見つかりません');
  return json(payload, 200, CACHE_SHORT);
}

async function getPublication(env: Env, id: string | null): Promise<Response> {
  if (!id) return error(404, 'publication が見つかりません');

  const manifest = await loadManifest(env);
  if (!manifest) return error(500, 'manifest が見つかりません');

  const summary = manifest.publications.find((item) => item.id === id);
  if (!summary) return error(404, 'publication が見つかりません');

  const doc = await loadDocument(env, id);
  if (!doc) return error(404, 'publication が見つかりません');
  return json(doc, 200, CACHE_SHORT);
}

async function getStaticSeoAsset(
  pathname: string,
  request: Request,
  env: Env,
): Promise<Response | null> {
  const cacheControl = staticSeoCacheControl(pathname);
  if (!cacheControl) return null;

  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) return response;

  const headers = new Headers(response.headers);
  headers.set('cache-control', cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function staticSeoCacheControl(pathname: string): string | null {
  if (pathname === '/robots.txt') return CACHE_DAILY;
  if (pathname === '/llms.txt' || pathname === '/sitemap.xml') return CACHE_HOURLY;
  return null;
}

async function getRawMarkdown(pathname: string, env: Env): Promise<Response | null> {
  const route = resolveRawMarkdownRoute(pathname);
  if (!route) return null;

  const manifest = await loadManifest(env);
  if (!manifest) return textError(500, 'manifest が見つかりません');

  const publications = manifest.publications.filter((item) => item.published);
  const summary = findRawPublication(publications, route);
  if (!summary) return textError(404, 'publication が見つかりません');

  const source = await loadText(env, `${RAW_KEY_PREFIX}${summary.id}.md`);
  if (source === null) return textError(500, 'raw markdown が見つかりません');
  return text(source, 'text/markdown; charset=utf-8', 200, CACHE_HOURLY);
}

async function loadManifest(env: Env): Promise<DocumentManifest | null> {
  return loadJsonObject<DocumentManifest>(env, MANIFEST_KEY);
}

async function loadDocument(env: Env, id: string): Promise<PapyrDocument | null> {
  const raw = await loadJsonObject<unknown>(env, `${DOC_KEY_PREFIX}${id}.json`);
  if (!raw) return null;
  return parseDocument(raw);
}

async function loadBookPayload(env: Env, id: string): Promise<BookPayload | null> {
  return loadJsonObject<BookPayload>(env, `${BOOK_KEY_PREFIX}${id}.json`);
}

async function loadJsonObject<T>(env: Env, key: string): Promise<T | null> {
  const source = await loadContent(env, key);
  if (source === null) return null;
  return JSON.parse(source) as T;
}

async function loadText(env: Env, key: string): Promise<string | null> {
  return loadContent(env, key);
}

async function loadContent(env: Env, key: string): Promise<string | null> {
  if (resolveContentSource(env) === 'assets') {
    return loadTextFromAssets(env, key);
  }
  const body = await env.PAPYR_DOCS_R2.get(key);
  return body ? body.text() : null;
}

async function loadTextFromAssets(env: Env, key: string): Promise<string | null> {
  const assetPath = `${ASSET_DATA_PREFIX}${stripPapyrDocsPrefix(key)}`;
  const request = new Request(`${ASSET_FETCH_ORIGIN}${assetPath}`);
  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`asset の読み込みに失敗しました: ${assetPath} (${response.status})`);
  }
  return response.text();
}

function resolveContentSource(env: Env): ContentSource {
  return env.PAPYR_DOCS_CONTENT_SOURCE === 'assets' ? 'assets' : 'r2';
}

function stripPapyrDocsPrefix(key: string): string {
  return key.startsWith('papyr-docs/') ? key.slice('papyr-docs/'.length) : key;
}

function findRawPublication(
  publications: PublicationSummary[],
  route: ReturnType<typeof resolveRawMarkdownRoute>,
): PublicationSummary | null {
  if (!route) return null;

  switch (route.kind) {
    case 'article':
    case 'book':
      return findPublicationBySlug(publications, route.kind, route.slug);
    case 'chapter':
      return findChapterBySlugs(publications, route.bookSlug, route.chapterSlug)?.chapter ?? null;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

function parsePublicationFilters(
  url: URL,
): { kind?: PublicationKind; section?: PublicationSection; published?: boolean } | string {
  const kind = url.searchParams.get('kind');
  const section = url.searchParams.get('section');
  const published = url.searchParams.get('published');
  if (kind && !isPublicationKind(kind)) {
    return 'kind query が不正です';
  }
  if (section && !isPublicationSection(section)) {
    return 'section query が不正です';
  }
  if (published && published !== 'true' && published !== 'false') {
    return 'published query は true / false を指定してください';
  }

  const filters: { kind?: PublicationKind; section?: PublicationSection; published?: boolean } = {};
  if (kind && isPublicationKind(kind)) filters.kind = kind;
  if (section && isPublicationSection(section)) filters.section = section;
  if (published) filters.published = published === 'true';
  return filters;
}

function decodeResourceId(pathname: string, prefix: string): string | null {
  const value = decodeURIComponent(pathname.slice(prefix.length + 1)).trim();
  return value || null;
}

function isPublicationKind(value: unknown): value is PublicationKind {
  return value === 'article' || value === 'book' || value === 'chapter';
}

function json(data: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}

function text(data: string, contentType: string, status = 200, cacheControl = 'no-store'): Response {
  return new Response(data, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': cacheControl,
    },
  });
}

function error(status: number, message: string): Response {
  return json({ error: message }, status);
}

function textError(status: number, message: string): Response {
  return text(message, 'text/plain; charset=utf-8', status);
}
