import baseConfig from './packages/config/eslint.config.mjs';

export default [
  {
    // apps/google-sheets is Apps Script (.gs), not linted by this config.
    // apps/excel is frozen — no source exists yet. Flat-config files (*.config.mjs)
    // are tooling, not app source — ESLint loads them as config, not as lint targets.
    // src-tauri/target is Cargo's build output (Rust), not JS/TS source — it happens
    // to contain a generated __global-api-script.js that ESLint would otherwise lint.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/google-sheets/**',
      'apps/excel/**',
      '**/*.config.mjs',
      '**/src-tauri/target/**',
    ],
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
