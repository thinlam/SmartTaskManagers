// Shared ESLint base — imported by the root eslint.config.mjs.
// Keep this file repo-agnostic (no absolute paths, no repo-specific ignores);
// root-level ignores belong in the root config, not here.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
