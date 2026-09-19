import baseConfig from './packages/config/eslint.config.mjs';

export default [
  {
    // apps/google-sheets is Apps Script (.gs), not linted by this config.
    // apps/excel is frozen — no source exists yet. Flat-config files (*.config.mjs)
    // are tooling, not app source — ESLint loads them as config, not as lint targets.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/google-sheets/**',
      'apps/excel/**',
      '**/*.config.mjs',
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
