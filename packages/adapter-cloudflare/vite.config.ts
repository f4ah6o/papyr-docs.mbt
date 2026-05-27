import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@f12o/papyr-backend/testing',
        replacement: resolve(__dirname, '../backend/src/testing.ts'),
      },
      {
        find: '@f12o/papyr-backend',
        replacement: resolve(__dirname, '../backend/src/index.ts'),
      },
      {
        find: '@f12o/papyr-core',
        replacement: resolve(__dirname, '../core/src/index.ts'),
      },
    ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: ['@f12o/papyr-core', '@f12o/papyr-backend'],
    },
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: './tsconfig.json' })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
