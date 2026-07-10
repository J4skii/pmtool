/**
 * Shared Jest preset for FlowOS workspaces.
 *
 * Usage in a workspace jest.config.js:
 *   const preset = require('@flowos/config/jest.preset');  // or relative path
 *   module.exports = { ...preset, displayName: 'api' };
 */
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { isolatedModules: true }],
  },
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.next/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  // Resolve workspace packages to source for fast, build-free tests.
  moduleNameMapper: {
    '^@flowos/shared$': '<rootDir>/../../packages/shared/src',
    '^@flowos/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@flowos/database$': '<rootDir>/../../packages/database/src',
  },
};
