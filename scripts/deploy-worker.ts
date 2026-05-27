import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { appRoot, type DeployTarget, writeTempWranglerConfig } from './cloudflare-config.js';

async function main(): Promise<void> {
  const target = normalizeTarget(process.argv[2]);
  const configPath = await writeTempWranglerConfig(target);

  try {
    await run('pnpm', ['exec', 'wrangler', 'deploy', '-c', configPath], appRoot);
  } finally {
    await rm(dirname(configPath), { recursive: true, force: true });
  }
}

function normalizeTarget(value: string | undefined): DeployTarget {
  if (value === 'preview' || value === 'production') return value;
  throw new Error('Usage: tsx scripts/deploy-worker.ts <preview|production>');
}

async function run(cmd: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with exit code ${code ?? 'null'}`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
