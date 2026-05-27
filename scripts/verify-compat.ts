import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = appRoot;
const fixtureRoot = resolve(repoRoot, 'fixtures/docs-site/upstream-snapshot/artifacts');

async function main(): Promise<void> {
  const checks = [
    ['documents.json', resolve(appRoot, 'dist/content/documents.json')],
    ['manifest.json', resolve(appRoot, 'dist/content/manifest.json')],
    ['search-index.json', resolve(appRoot, 'src/client/public/search-index.json')],
  ] as const;

  for (const [fixturePath, outputPath] of checks) {
    await assertSameFile(resolve(fixtureRoot, fixturePath), outputPath);
  }

  await assertSameTree(resolve(fixtureRoot, 'r2'), resolve(appRoot, 'dist/content/r2'));
  await assertSameTree(
    resolve(fixtureRoot, 'public-data'),
    resolve(appRoot, 'src/client/public/__papyr_docs_data'),
  );

  console.log('Compatibility artifacts match the frozen snapshot.');
}

async function assertSameTree(expectedRoot: string, actualRoot: string): Promise<void> {
  const expectedFiles = await collectFiles(expectedRoot);
  const actualFiles = await collectFiles(actualRoot);

  const expectedRelative = expectedFiles.map((file) => relative(expectedRoot, file)).sort();
  const actualRelative = actualFiles.map((file) => relative(actualRoot, file)).sort();

  if (expectedRelative.join('\n') !== actualRelative.join('\n')) {
    throw new Error(
      `File tree mismatch.\nexpected:\n${expectedRelative.join('\n')}\nactual:\n${actualRelative.join('\n')}`,
    );
  }

  for (const rel of expectedRelative) {
    await assertSameFile(join(expectedRoot, rel), join(actualRoot, rel));
  }
}

async function collectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(full)));
    } else if (entry.isFile()) {
      result.push(full);
    }
  }
  result.sort();
  return result;
}

async function assertSameFile(expectedPath: string, actualPath: string): Promise<void> {
  const [expectedStat, actualStat] = await Promise.all([stat(expectedPath), stat(actualPath)]);
  if (!expectedStat.isFile() || !actualStat.isFile()) {
    throw new Error(`Expected regular files: ${expectedPath} ${actualPath}`);
  }

  const [expected, actual] = await Promise.all([
    readFile(expectedPath, 'utf8'),
    readFile(actualPath, 'utf8'),
  ]);
  if (expected !== actual) {
    throw new Error(
      `Artifact mismatch: ${relative(repoRoot, actualPath)} does not match ${relative(repoRoot, expectedPath)}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
