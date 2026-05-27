import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: ['valibot'],
    },
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: './tsconfig.json' })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
