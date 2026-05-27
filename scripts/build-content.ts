import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { Block, Inline, PapyrDocument } from '@f12o/papyr-core';
import { parseMarkdown } from '@f12o/papyr-markdown';
import type { ArtifactFile, BuildBridge } from './lib/build-bridge.js';
import { BuildPipelineError, toFailureEnvelope } from './lib/build-error.js';
import { buildFallbackArtifacts } from './lib/fallback-projection.js';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const contentRoot = resolve(appRoot, 'content');
const documentsOut = resolve(appRoot, 'dist/content/documents.json');
const manifestOut = resolve(appRoot, 'dist/content/manifest.json');
const r2BooksOut = resolve(appRoot, 'dist/content/r2/books');
const r2DocsOut = resolve(appRoot, 'dist/content/r2/docs');
const r2RawOut = resolve(appRoot, 'dist/content/r2/raw');
const r2ManifestOut = resolve(appRoot, 'dist/content/r2/manifest.json');
const searchIndexOut = resolve(appRoot, 'src/client/public/search-index.json');
const publicDataRoot = resolve(appRoot, 'src/client/public/__papyr_docs_data');
const publicBooksOut = resolve(publicDataRoot, 'books');
const publicDocsOut = resolve(publicDataRoot, 'docs');
const publicRawOut = resolve(publicDataRoot, 'raw');
const publicManifestOut = resolve(publicDataRoot, 'manifest.json');
const staticRoutesOut = resolve(appRoot, 'dist/content/static-routes');

interface ArtifactTargetRoot {
  sourcePrefix: string;
  outputRoot: string;
}

interface RawEntry {
  path: string;
  source: string;
  frontmatter: Record<string, unknown>;
  document: PapyrDocument;
}

export interface BuildContentOptions {
  bridge?: BuildBridge;
  generatedAt?: string;
}

export async function runBuildContent(options: BuildContentOptions = {}): Promise<void> {
  const entries = await collectMarkdown(contentRoot);
  if (entries.length === 0) {
    throw new BuildPipelineError(
      'js-parse',
      `${relative(appRoot, contentRoot)} に markdown が見つかりません`,
    );
  }

  const rawEntries = await Promise.all(entries.map((path) => loadEntry(path)));
  const generatedAt =
    options.generatedAt ?? process.env.PAPYR_GENERATED_AT ?? new Date().toISOString();
  const sourceEntries = rawEntries.map((entry) => ({
    path: entry.path,
    source: entry.source,
    frontmatter: entry.frontmatter,
    document: entry.document,
  }));
  const result = options.bridge
    ? await options.bridge.runProjection({ sourceEntries, generatedAt })
    : {
        ok: true as const,
        artifacts: buildFallbackArtifacts({ sourceEntries, generatedAt }),
      };

  if (!result.ok) {
    throw new BuildPipelineError('mbt-projection', result.message, result.diagnostics);
  }

  await writeArtifactBundle(result.artifacts);

  console.log(
    `documents.json を出力しました: ${relative(appRoot, documentsOut)} (${rawEntries.length} docs)`,
  );
  console.log(`manifest.json を出力しました: ${relative(appRoot, manifestOut)}`);
  console.log(`search-index.json を出力しました: ${relative(appRoot, searchIndexOut)}`);
  console.log(`e2e assets を出力しました: ${relative(appRoot, publicDataRoot)}`);
}

async function collectMarkdown(dir: string): Promise<string[]> {
  const result: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        result.push(full);
      }
    }
  }
  try {
    await stat(dir);
  } catch {
    throw new BuildPipelineError('js-parse', `content ディレクトリが存在しません: ${dir}`);
  }
  await walk(dir);
  result.sort();
  return result;
}

async function loadEntry(path: string): Promise<RawEntry> {
  const source = await readFile(path, 'utf8');
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BuildPipelineError(
      'js-parse',
      `${relative(contentRoot, path)} の frontmatter parse に失敗しました: ${reason}`,
    );
  }
  return {
    path: relative(contentRoot, path).replaceAll('\\', '/'),
    source,
    frontmatter: (parsed.data ?? {}) as Record<string, unknown>,
    // `parseMarkdown` only uses `documentId` for the top-level document id.
    // Block ids stay generator-based, so MoonBit can safely own semantic id normalization.
    document: normalizeDocumentForMoonBit(parseMarkdown(parsed.content)),
  };
}

function normalizeDocumentForMoonBit(document: PapyrDocument): PapyrDocument {
  return {
    ...document,
    blocks: document.blocks.map(normalizeBlockForMoonBit),
  };
}

function normalizeBlockForMoonBit(block: Block): Block {
  const [kind, payload] = block;
  switch (kind) {
    case 'Heading':
      return [kind, { ...payload, content: payload.content.map(normalizeInlineForMoonBit) }];
    case 'Paragraph':
      return [kind, { ...payload, content: payload.content.map(normalizeInlineForMoonBit) }];
    case 'List':
      return [
        kind,
        {
          ...payload,
          items: payload.items.map((item) => ({
            ...item,
            blocks: item.blocks.map(normalizeBlockForMoonBit),
          })),
        },
      ];
    default:
      return block;
  }
}

function normalizeInlineForMoonBit(inline: Inline): Inline {
  return {
    ...inline,
    marks: inline.marks ?? [],
  };
}

async function writeArtifactBundle(files: ArtifactFile[]): Promise<void> {
  await rm(resolve(appRoot, 'dist/content/r2'), { recursive: true, force: true });
  await rm(publicDataRoot, { recursive: true, force: true });
  await rm(staticRoutesOut, { recursive: true, force: true });

  await Promise.all(
    files.map(async (file) => {
      const target = resolveArtifactTarget(file.path);
      const content = normalizeArtifactContent(file);
      await writeText(target, content);
    }),
  );
}

function resolveArtifactTarget(path: string): string {
  const directFiles = new Map<string, string>([
    ['documents.json', documentsOut],
    ['manifest.json', manifestOut],
    ['search-index.json', searchIndexOut],
    ['r2/manifest.json', r2ManifestOut],
    ['public-data/manifest.json', publicManifestOut],
  ]);
  const direct = directFiles.get(path);
  if (direct) {
    return direct;
  }

  const rootedTargets: ArtifactTargetRoot[] = [
    { sourcePrefix: 'r2/books/', outputRoot: r2BooksOut },
    { sourcePrefix: 'r2/docs/', outputRoot: r2DocsOut },
    { sourcePrefix: 'r2/raw/', outputRoot: r2RawOut },
    { sourcePrefix: 'public-data/books/', outputRoot: publicBooksOut },
    { sourcePrefix: 'public-data/docs/', outputRoot: publicDocsOut },
    { sourcePrefix: 'public-data/raw/', outputRoot: publicRawOut },
    { sourcePrefix: 'static-routes/', outputRoot: staticRoutesOut },
  ];
  for (const target of rootedTargets) {
    if (path.startsWith(target.sourcePrefix)) {
      return resolve(target.outputRoot, path.slice(target.sourcePrefix.length));
    }
  }

  throw new BuildPipelineError('mbt-projection', `unknown artifact path from MoonBit: ${path}`);
}

function normalizeArtifactContent(file: ArtifactFile): string {
  if (!file.path.endsWith('.json')) {
    return file.content;
  }
  return `${JSON.stringify(JSON.parse(file.content) as unknown, null, 2)}\n`;
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runBuildContent().catch((error: unknown) => {
    if (error instanceof BuildPipelineError) {
      process.stderr.write(`${JSON.stringify(toFailureEnvelope(error))}\n`);
      console.error(error.message);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `${JSON.stringify({ ok: false, phase: 'unknown', message, diagnostics: [] })}\n`,
      );
      console.error(message);
    }
    process.exitCode = 1;
  });
}
