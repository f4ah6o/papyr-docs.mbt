/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig } from 'vite';
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  defineViteConfig({
    root: resolve(__dirname, 'src/client'),
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: '@f12o/papyr-editor-ui/styles.css',
          replacement: resolve(__dirname, 'packages/editor-ui/src/styles.css'),
        },
        {
          find: '@f12o/papyr-preview/styles.css',
          replacement: resolve(__dirname, 'packages/preview/src/styles.css'),
        },
        {
          find: '@f12o/papyr-adapter-cloudflare',
          replacement: resolve(__dirname, 'packages/adapter-cloudflare/src/index.ts'),
        },
        {
          find: '@f12o/papyr-core',
          replacement: resolve(__dirname, 'packages/core/src/index.ts'),
        },
        {
          find: '@f12o/papyr-editor-ui',
          replacement: resolve(__dirname, 'packages/editor-ui/src/index.ts'),
        },
        {
          find: '@f12o/papyr-editor',
          replacement: resolve(__dirname, 'packages/editor/src/index.ts'),
        },
        {
          find: '@f12o/papyr-markdown',
          replacement: resolve(__dirname, 'packages/markdown/src/index.ts'),
        },
        {
          find: '@f12o/papyr-preview',
          replacement: resolve(__dirname, 'packages/preview/src/index.ts'),
        },
        {
          find: '@f12o/papyr-relation',
          replacement: resolve(__dirname, 'packages/relation/src/index.ts'),
        },
        {
          find: '@f12o/papyr-relation-check',
          replacement: resolve(__dirname, 'packages/relation-check/src/index.ts'),
        },
        {
          find: '@f12o/papyr-relation-policy',
          replacement: resolve(__dirname, 'packages/relation-policy/src/index.ts'),
        },
        {
          find: '@f12o/papyr-relation-resolver',
          replacement: resolve(__dirname, 'packages/relation-resolver/src/index.ts'),
        },
        {
          find: '@f12o/papyr-search',
          replacement: resolve(__dirname, 'packages/search/src/index.ts'),
        },
        {
          find: '@f12o/papyr-workspace',
          replacement: resolve(__dirname, 'packages/workspace/src/index.ts'),
        },
        {
          find: '@f12o/papyr-adapter-opfs',
          replacement: resolve(__dirname, 'packages/adapter-opfs/src/index.ts'),
        },
      ],
    },
    build: {
      outDir: resolve(__dirname, 'dist/client'),
      emptyOutDir: true,
    },
  }),
  defineVitestConfig({
    test: {
      root: __dirname,
      environment: 'node',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  }),
);
