import { bindings, type CloudflareConfig, defineConfig } from 'cf/config';

const RUN_WORKER_FIRST = [
  '/api/*',
  '/articles/*.md',
  '/books/*.md',
  '/books/*/*.md',
  '/llms.txt',
  '/robots.txt',
  '/sitemap.xml',
];

const assets = {
  htmlHandling: 'auto-trailing-slash',
  notFoundHandling: 'single-page-application',
  runWorkerFirst: RUN_WORKER_FIRST,
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

const workerBase = {
  compatibilityDate: '2026-04-23',
  entrypoint: '../../src/worker.ts',
  assets,
};

export default defineConfig((ctx): CloudflareConfig => {
  switch (ctx.mode) {
    case 'e2e':
      return {
        worker: {
          ...workerBase,
          name: 'papyr-docs',
          workersDev: false,
          env: {
            ASSETS: bindings.assets(),
            PAPYR_DOCS_CONTENT_SOURCE: bindings.text('assets'),
          },
        },
      };
    case 'preview':
      return {
        worker: {
          ...workerBase,
          name: 'papyr-docs-preview',
          workersDev: true,
          previewUrls: true,
          env: {
            ASSETS: bindings.assets(),
            PAPYR_DOCS_R2: bindings.r2({
              name: requireEnv('PAPYR_DOCS_R2_PREVIEW_BUCKET'),
            }),
          },
        },
      };
    case 'production':
      return {
        worker: {
          ...workerBase,
          name: 'papyr-docs',
          workersDev: false,
          env: {
            ASSETS: bindings.assets(),
            PAPYR_DOCS_R2: bindings.r2({
              name: requireEnv('PAPYR_DOCS_R2_BUCKET'),
            }),
          },
        },
      };
    default:
      // `cf dev` (local development). Bindings run against the local R2
      // simulation, so the bucket name only needs to be a valid R2 name.
      // PAPYR_DOCS_R2_PREVIEW_BUCKET wins when set to match scripts/upload-r2.ts.
      return {
        worker: {
          ...workerBase,
          name: 'papyr-docs',
          workersDev: false,
          env: {
            ASSETS: bindings.assets(),
            PAPYR_DOCS_R2: bindings.r2({
              name:
                process.env.PAPYR_DOCS_R2_PREVIEW_BUCKET ?? 'papyr-docs-local',
            }),
          },
        },
      };
  }
});
