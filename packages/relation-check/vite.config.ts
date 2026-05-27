import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      '@f12o/papyr-relation': resolve(__dirname, '../relation/src/index.ts'),
      '@f12o/papyr-relation-policy': resolve(__dirname, '../relation-policy/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: ['@f12o/papyr-relation', '@f12o/papyr-relation-policy'],
    },
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: './tsconfig.json' })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
