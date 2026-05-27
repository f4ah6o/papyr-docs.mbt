import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(appRoot, '..', '..');
const fixtureRoot = resolve(repoRoot, 'fixtures/docs-site/upstream-snapshot/artifacts');

const pinnedGeneratedAt = process.env.PAPYR_GENERATED_AT ?? '2026-05-02T06:53:38.847Z';
const pinnedUpstreamCommit =
  process.env.PAPYR_UPSTREAM_COMMIT ?? '0b04ac960da9e601c241f4eaed3b28618a10b8a1';

async function main(): Promise<void> {
  await rm(fixtureRoot, { recursive: true, force: true });
  await mkdir(fixtureRoot, { recursive: true });

  await cp(resolve(appRoot, 'dist/content/documents.json'), resolve(fixtureRoot, 'documents.json'));
  await cp(resolve(appRoot, 'dist/content/manifest.json'), resolve(fixtureRoot, 'manifest.json'));
  await cp(
    resolve(appRoot, 'src/client/public/search-index.json'),
    resolve(fixtureRoot, 'search-index.json'),
  );
  await cp(resolve(appRoot, 'dist/content/r2'), resolve(fixtureRoot, 'r2'), { recursive: true });

  const publicDataRoot = resolve(fixtureRoot, 'public-data');
  await mkdir(publicDataRoot, { recursive: true });
  await cp(
    resolve(appRoot, 'src/client/public/__papyr_docs_data/docs'),
    resolve(publicDataRoot, 'docs'),
    { recursive: true },
  );
  await cp(
    resolve(appRoot, 'src/client/public/__papyr_docs_data/books'),
    resolve(publicDataRoot, 'books'),
    { recursive: true },
  );
  await cp(
    resolve(appRoot, 'src/client/public/__papyr_docs_data/raw'),
    resolve(publicDataRoot, 'raw'),
    { recursive: true },
  );
  await cp(
    resolve(appRoot, 'src/client/public/__papyr_docs_data/manifest.json'),
    resolve(publicDataRoot, 'manifest.json'),
  );

  const manifest = JSON.parse(
    await readFile(resolve(fixtureRoot, 'manifest.json'), 'utf8'),
  ) as { publications: unknown[] };
  const metadata = {
    kind: 'bridge-pipeline-fixture',
    pinnedUpstreamCommit,
    generatedAt: pinnedGeneratedAt,
    sourceContent: 'f4ah6o/papyr apps/docs/content at pinned commit',
    generatedBy: 'papyr.mbt vendored apps/docs build-content + MoonBit build-docs bridge',
    refreshCommand:
      'PAPYR_GENERATED_AT=2026-05-02T06:53:38.847Z pnpm --filter @f12o/papyr-apps-docs build:content && pnpm --filter @f12o/papyr-apps-docs sync:compat-fixtures',
    publicationCount: manifest.publications.length,
  };
  await writeFile(
    resolve(fixtureRoot, 'bridge-pipeline.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
