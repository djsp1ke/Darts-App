import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points for all modules
  entry: {
    index: 'src/index.ts',
    'scoring/index': 'src/scoring/index.ts',
    'components/index': 'src/components/index.ts',
    'styles/index': 'src/styles/index.ts',
    'online/index': 'src/online/index.ts',
    'services/index': 'src/services/index.ts',
    'constants/index': 'src/constants/index.ts',
    'types/index': 'src/types/index.ts',
  },

  // Output formats
  format: ['cjs', 'esm'],

  // Generate TypeScript declarations
  dts: true,

  // Generate sourcemaps
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Split chunks for better tree-shaking
  splitting: true,

  // Minify output for production
  minify: false,

  // External dependencies (don't bundle)
  external: ['react', 'react-dom'],

  // Tree-shaking
  treeshake: true,

  // Target environment
  target: 'es2020',

  // Platform
  platform: 'browser',

  // Output directory
  outDir: 'dist',

  // Enable experimental DTS bundling
  experimentalDts: false,

  // Define global constants
  define: {
    'process.env.NODE_ENV': '"production"',
  },

  // ESBuild options
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
});
