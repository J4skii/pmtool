/**
 * Shared ESLint flat config for FlowOS TypeScript workspaces.
 *
 * Usage in a workspace eslint.config.js:
 *   const base = require('@flowos/config/eslint.config');  // or relative path
 *   module.exports = [...base];  // append app-specific overrides after
 *
 * Peer deps expected at the workspace root:
 *   eslint ^9, typescript-eslint ^8
 */
const tseslint = require('typescript-eslint');

module.exports = [
  {
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**', '**/.turbo/**', '**/playwright-report/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Correctness
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'off', // enable per-app with typed linting
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Consistency
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Tests and seeds may use console and looser typing.
    files: ['**/*.spec.ts', '**/*.test.ts', '**/e2e/**', '**/prisma/seed.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
