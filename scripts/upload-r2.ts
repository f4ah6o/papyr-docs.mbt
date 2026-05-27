import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  appRoot,
  type DeployTarget,
  renderWranglerConfig,
  resolveBucketName,
} from './cloudflare-config.js';

const here = dirname(fileURLToPath(import.meta.url));
const uploadRoot = resolve(appRoot, 'dist/content/r2');
const localPersistPath = resolve(appRoot, '.wrangler/state');
const uploadManifestKey = '.upload-manifest.json';
const uploadManifestVersion = 1;

export interface UploadManifestEntry {
  sha256: string;
  size: number;
  contentType: string;
}

export interface UploadManifest {
  version: 1;
  generatedAt: string;
  files: Record<string, UploadManifestEntry>;
}

export interface UploadFile {
  path: string;
  key: string;
  entry: UploadManifestEntry;
}

export interface UploadPlan {
  puts: UploadFile[];
  deletes: string[];
}

async function main(): Promise<void> {
  const mode = normalizeMode(process.env.R2_UPLOAD_MODE);
  const target = resolveUploadTarget(mode, process.env.R2_UPLOAD_TARGET);
  const buckets =
    mode === 'remote' && target !== 'both' ? [resolveRemoteBucket(target)] : resolveLocalBuckets();
  const files = await collectUploadFiles(uploadRoot);
  if (files.length === 0) {
    console.warn(
      [
        `warning: アップロード対象がありません (${relative(appRoot, uploadRoot)})`,
        'R2 upload をスキップします。',
        'MoonBit build bridge が r2 artifact を返していない可能性があります。',
      ].join(' '),
    );
    return;
  }

  const configPath = await writeTempConfig(mode, target);
  try {
    for (const bucket of buckets) {
      const previousManifest = await readRemoteUploadManifest(configPath, bucket, mode);
      const plan = createUploadPlan(files, previousManifest);
      console.log(
        [
          `R2 diff: bucket=${bucket}`,
          `put=${plan.puts.length}`,
          `delete=${plan.deletes.length}`,
          `unchanged=${files.length - plan.puts.length}`,
        ].join(' '),
      );

      for (const key of plan.deletes) {
        await deleteObject(configPath, bucket, key, mode);
      }
      for (const file of orderPuts(plan.puts)) {
        await putObject(configPath, bucket, file.key, file.path, file.entry.contentType, mode);
      }
      await writeRemoteUploadManifest(configPath, bucket, files, mode);
    }
  } finally {
    await rm(dirname(configPath), { recursive: true, force: true });
  }
}

function normalizeMode(value: string | undefined): 'local' | 'remote' {
  if (!value || value === 'local') return 'local';
  if (value === 'remote') return 'remote';
  throw new Error(`R2_UPLOAD_MODE が不正です: ${value}`);
}

async function collectUploadFiles(root: string): Promise<UploadFile[]> {
  try {
    await stat(root);
  } catch {
    return [];
  }

  const result: UploadFile[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.md'))) {
        const key = relative(root, full).replaceAll('\\', '/');
        result.push({
          path: full,
          key,
          entry: await createManifestEntry(full),
        });
      }
    }
  }

  await walk(root);
  result.sort((a, b) => a.key.localeCompare(b.key));
  return result;
}

function resolveContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.md')) return 'text/markdown; charset=utf-8';
  throw new Error(`未対応の upload 拡張子です: ${path}`);
}

function resolveUploadTarget(
  mode: 'local' | 'remote',
  value: string | undefined,
): DeployTarget | 'both' {
  if (mode === 'local') return 'both';
  if (!value || value === 'production') return 'production';
  if (value === 'preview') return 'preview';
  throw new Error(`R2_UPLOAD_TARGET が不正です: ${value}`);
}

function resolveLocalBuckets(): string[] {
  const candidates = [
    process.env.PAPYR_DOCS_R2_PREVIEW_BUCKET?.trim(),
    process.env.PAPYR_DOCS_R2_BUCKET?.trim(),
  ].filter((value): value is string => Boolean(value));
  if (candidates.length === 0) {
    throw new Error(
      '環境変数 PAPYR_DOCS_R2_BUCKET または PAPYR_DOCS_R2_PREVIEW_BUCKET が設定されていません',
    );
  }
  return [...new Set(candidates)];
}

function resolveRemoteBucket(target: DeployTarget): string {
  return resolveBucketName(target);
}

export function createUploadPlan(
  files: UploadFile[],
  previous: UploadManifest | undefined,
): UploadPlan {
  const previousFiles = previous?.version === uploadManifestVersion ? previous.files : {};
  const nextFiles = new Map(files.map((file) => [file.key, file.entry]));
  const puts = files.filter((file) => !sameManifestEntry(file.entry, previousFiles[file.key]));
  const deletes = Object.keys(previousFiles)
    .filter((key) => !nextFiles.has(key))
    .sort();
  return { puts, deletes };
}

function sameManifestEntry(
  next: UploadManifestEntry,
  previous: UploadManifestEntry | undefined,
): boolean {
  if (!previous) return false;
  return (
    next.sha256 === previous.sha256 &&
    next.size === previous.size &&
    next.contentType === previous.contentType
  );
}

function orderPuts(files: UploadFile[]): UploadFile[] {
  return [...files].sort((a, b) => {
    if (a.key === 'manifest.json') return 1;
    if (b.key === 'manifest.json') return -1;
    return a.key.localeCompare(b.key);
  });
}

async function createManifestEntry(path: string): Promise<UploadManifestEntry> {
  const content = await readFile(path);
  return {
    sha256: createHash('sha256').update(content).digest('hex'),
    size: content.byteLength,
    contentType: resolveContentType(path),
  };
}

async function readRemoteUploadManifest(
  configPath: string,
  bucket: string,
  mode: 'local' | 'remote',
): Promise<UploadManifest | undefined> {
  const dir = await mkdtemp(join(tmpdir(), 'papyr-docs-r2-manifest-'));
  const path = join(dir, uploadManifestKey);
  try {
    const result = await run(
      'pnpm',
      [
        'exec',
        'wrangler',
        '-c',
        configPath,
        'r2',
        'object',
        'get',
        `${bucket}/papyr-docs/${uploadManifestKey}`,
        '--file',
        path,
        mode === 'remote' ? '--remote' : '--local',
        ...(mode === 'local' ? ['--persist-to', localPersistPath] : []),
      ],
      appRoot,
      { allowFailure: true, quiet: true },
    );
    if (result !== 0) return undefined;
    const manifest = JSON.parse(await readFile(path, 'utf8')) as UploadManifest;
    return manifest.version === uploadManifestVersion ? manifest : undefined;
  } catch {
    return undefined;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeRemoteUploadManifest(
  configPath: string,
  bucket: string,
  files: UploadFile[],
  mode: 'local' | 'remote',
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'papyr-docs-r2-manifest-'));
  const path = join(dir, uploadManifestKey);
  const manifest: UploadManifest = {
    version: uploadManifestVersion,
    generatedAt: new Date().toISOString(),
    files: Object.fromEntries(files.map((file) => [file.key, file.entry])),
  };
  try {
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await putObject(configPath, bucket, uploadManifestKey, path, 'application/json', mode);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function putObject(
  configPath: string,
  bucket: string,
  key: string,
  file: string,
  contentType: string,
  mode: 'local' | 'remote',
): Promise<void> {
  const objectPath = `${bucket}/papyr-docs/${key}`;
  await run(
    'pnpm',
    [
      'exec',
      'wrangler',
      '-c',
      configPath,
      'r2',
      'object',
      'put',
      objectPath,
      '--file',
      file,
      '--content-type',
      contentType,
      mode === 'remote' ? '--remote' : '--local',
      ...(mode === 'local' ? ['--persist-to', localPersistPath] : []),
    ],
    appRoot,
  );
  console.log(`uploaded: ${objectPath}`);
}

async function deleteObject(
  configPath: string,
  bucket: string,
  key: string,
  mode: 'local' | 'remote',
): Promise<void> {
  const objectPath = `${bucket}/papyr-docs/${key}`;
  await run(
    'pnpm',
    [
      'exec',
      'wrangler',
      '-c',
      configPath,
      'r2',
      'object',
      'delete',
      objectPath,
      '--force',
      mode === 'remote' ? '--remote' : '--local',
      ...(mode === 'local' ? ['--persist-to', localPersistPath] : []),
    ],
    appRoot,
  );
  console.log(`deleted: ${objectPath}`);
}

async function writeTempConfig(
  mode: 'local' | 'remote',
  target: DeployTarget | 'both',
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'papyr-docs-r2-'));
  const path = join(dir, 'wrangler.toml');
  const targetForConfig = target === 'both' ? 'preview' : target;
  const config = renderWranglerConfig(targetForConfig, {
    includeAccountId: mode === 'remote',
    workerName: 'papyr-docs-r2-upload',
  });
  await writeFile(path, config, 'utf8');
  return path;
}

async function run(
  cmd: string,
  args: string[],
  cwd: string,
  options: { allowFailure?: boolean; quiet?: boolean } = {},
): Promise<number> {
  return await new Promise<number>((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: options.quiet ? 'ignore' : 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      const exitCode = code ?? 1;
      if (exitCode === 0 || options.allowFailure) resolvePromise(exitCode);
      else reject(new Error(`${cmd} ${args.join(' ')} failed with exit code ${exitCode}`));
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
