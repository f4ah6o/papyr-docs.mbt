import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type {
  BuildBridge,
  BridgeDiagnostic,
  ProjectionInput,
  ProjectionResult,
  ArtifactFile,
} from './build-bridge.js';

export interface CliBridgeOptions {
  // Repo root used as cwd when invoking `moon run`. Required because the
  // `moon` CLI must be run from inside the MoonBit project.
  repoRoot: string;
  // Override the binary used to spawn the projection backend. Defaults to
  // `moon`. Tests pass a stub here.
  command?: string;
  // Override args. Defaults to the `moon run src/cmd/main` invocation.
  buildArgs?: (input: ProjectionInput, paths: SubprocessPaths) => string[];
}

export interface SubprocessPaths {
  sourceEntriesPath: string;
}

interface CliSuccess {
  ok: true;
  command: 'build-docs' | 'build-docs-source';
  artifacts: { files: ArtifactFile[] };
}

interface CliFailure {
  ok: false;
  message: string;
  diagnostics: BridgeDiagnostic[];
}

type CliResult = CliSuccess | CliFailure;

function isCliResult(value: unknown): value is CliResult {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

// Extracts the last machine-readable JSON line from CLI stdout. The MoonBit
// CLI may emit build logs from `moon run` ahead of its result line on a fresh
// worktree, so we scan from the end.
export function parseMoonCliJson(stdout: string): CliResult {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line || !line.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (isCliResult(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  throw new Error(`failed to parse MoonBit CLI JSON from stdout:\n${stdout}`);
}

function defaultBuildArgs(input: ProjectionInput, paths: SubprocessPaths): string[] {
  return [
    'run',
    'src/cmd/main',
    '--target',
    'native',
    '--',
    'build-docs-source',
    input.generatedAt,
    paths.sourceEntriesPath,
  ];
}

export function createCliBridge(options: CliBridgeOptions): BuildBridge {
  const command = options.command ?? 'moon';
  const buildArgs = options.buildArgs ?? defaultBuildArgs;
  return {
    async runProjection(input: ProjectionInput): Promise<ProjectionResult> {
      const tempRoot = await mkdtemp(join(tmpdir(), 'papyr-docs-build-'));
      const sourceEntriesPath = resolve(tempRoot, 'source-entries.json');

      try {
        await writeJson(sourceEntriesPath, { entries: input.sourceEntries });

        const args = buildArgs(input, { sourceEntriesPath });
        const result = spawnSync(command, args, {
          cwd: options.repoRoot,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        });

        if (result.error) {
          throw new Error(`failed to spawn ${command}: ${result.error.message}`);
        }
        if (result.status !== 0) {
          throw new Error(
            result.stdout || result.stderr || `${command} exited with code ${result.status}`,
          );
        }

        const parsed = parseMoonCliJson(result.stdout);
        if (parsed.ok) {
          return { ok: true, artifacts: parsed.artifacts.files };
        }
        return { ok: false, message: parsed.message, diagnostics: parsed.diagnostics };
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    },
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
