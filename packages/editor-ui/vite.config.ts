import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      '@f12o/papyr-core': resolve(__dirname, '../core/src/index.ts'),
      '@f12o/papyr-editor': resolve(__dirname, '../editor/src/index.ts'),
      '@f12o/papyr-markdown': resolve(__dirname, '../markdown/src/index.ts'),
      '@f12o/papyr-preview': resolve(__dirname, '../preview/src/index.ts'),
    },
  },
  plugins: [react(), dts({ rollupTypes: true, tsconfigPath: './tsconfig.json' })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        '@f12o/papyr-core',
        '@f12o/papyr-editor',
        '@f12o/papyr-markdown',
        '@f12o/papyr-preview',
        '@excalidraw/excalidraw',
        /^@excalidraw\//,
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
