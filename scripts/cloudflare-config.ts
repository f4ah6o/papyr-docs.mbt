import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const appRoot = resolve(here, '..');

export type DeployTarget = 'preview' | 'production';
type RenderWranglerConfigOptions = {
  assetsDirectory?: string;
  includeAccountId?: boolean;
  mainPath?: string;
  workerName?: string;
};

const COMPATIBILITY_DATE = '2026-04-23';
const PRODUCTION_WORKER_NAME = 'papyr-docs';
const PREVIEW_WORKER_NAME = 'papyr-docs-preview';

const RUN_WORKER_FIRST = [
  '/api/*',
  '/articles/*.md',
  '/books/*.md',
  '/books/*/*.md',
  '/llms.txt',
  '/robots.txt',
  '/sitemap.xml',
];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

export function resolveBucketName(target: DeployTarget): string {
  if (target === 'preview') {
    return requireEnv('PAPYR_DOCS_R2_PREVIEW_BUCKET');
  }
  return requireEnv('PAPYR_DOCS_R2_BUCKET');
}

export function resolveWorkerName(target: DeployTarget): string {
  return target === 'preview' ? PREVIEW_WORKER_NAME : PRODUCTION_WORKER_NAME;
}

export function renderWranglerConfig(
  target: DeployTarget,
  options: RenderWranglerConfigOptions = {},
): string {
  const includeAccountId = options.includeAccountId ?? true;
  const bucketName = resolveBucketName(target);
  const previewBucket = requireEnv('PAPYR_DOCS_R2_PREVIEW_BUCKET');
  const lines = [
    `name = "${options.workerName ?? resolveWorkerName(target)}"`,
    `main = "${options.mainPath ?? './src/worker.ts'}"`,
    `compatibility_date = "${COMPATIBILITY_DATE}"`,
    `workers_dev = ${target === 'preview' ? 'true' : 'false'}`,
    `preview_urls = ${target === 'preview' ? 'true' : 'false'}`,
    '',
    '[[r2_buckets]]',
    'binding = "PAPYR_DOCS_R2"',
    `bucket_name = "${bucketName}"`,
    `preview_bucket_name = "${previewBucket}"`,
    '',
    '[assets]',
    `directory = "${options.assetsDirectory ?? './dist/client'}"`,
    'binding = "ASSETS"',
    `run_worker_first = [${RUN_WORKER_FIRST.map((entry) => `"${entry}"`).join(', ')}]`,
    'not_found_handling = "single-page-application"',
    '',
  ];
  if (includeAccountId) {
    lines.splice(3, 0, `account_id = "${requireEnv('CLOUDFLARE_ACCOUNT_ID')}"`);
  }
  return `${lines.join('\n')}\n`;
}

export async function writeTempWranglerConfig(target: DeployTarget): Promise<string> {
  const scratchRoot = resolve(appRoot, '.wrangler/tmp');
  await mkdir(scratchRoot, { recursive: true });
  const dir = await mkdtemp(join(scratchRoot, `papyr-docs-${target}-`));
  const path = join(dir, 'wrangler.toml');
  const mainPath = relative(dir, resolve(appRoot, 'src/worker.ts')).replaceAll('\\', '/');
  const assetsDirectory = relative(dir, resolve(appRoot, 'dist/client')).replaceAll('\\', '/');
  await writeFile(path, renderWranglerConfig(target, { assetsDirectory, mainPath }), 'utf8');
  return path;
}
