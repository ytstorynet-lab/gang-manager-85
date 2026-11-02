import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'dist-app',
    'test-results',
    'playwright-report',
    'coverage',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The simulation must stay replayable from a seed, so it may only use src/sim/rng.ts.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded generator in src/sim/rng.ts.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'The simulation must run without a browser.' },
        { name: 'document', message: 'The simulation must run without a browser.' },
      ],
    },
  },
]);
