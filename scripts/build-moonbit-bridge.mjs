#!/usr/bin/env node

import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(rootDir, 'packages/moonbit-bridge/src/generated');
const buildDir = resolve(rootDir, '_build/js/debug/build/bridge');

const result = spawnSync('moon', ['build', '--target', 'js', 'src/bridge'], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

mkdirSync(outDir, { recursive: true });
for (const file of ['bridge.js', 'bridge.js.map', 'bridge.d.ts', 'moonbit.d.ts']) {
  cpSync(resolve(buildDir, file), resolve(outDir, file));
}
