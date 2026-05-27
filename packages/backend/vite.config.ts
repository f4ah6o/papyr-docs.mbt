import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        testing: resolve(__dirname, 'src/testing.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: ['@f12o/papyr-core', /^node:/],
    },
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: './tsconfig.json', include: ['src'] })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
