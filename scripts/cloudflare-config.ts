import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const appRoot = resolve(here, '..');

/**
 * cf project directory holding cloudflare.config.ts / wrangler.config.ts.
 * cf requires the project to be a workspace package rather than the workspace
 * root, so the deployable Worker lives in apps/worker.
 */
export const cfProjectDir = resolve(appRoot, 'apps/worker');

export type DeployTarget = 'preview' | 'production';

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
