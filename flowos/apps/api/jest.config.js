/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@flowos/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@flowos/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
  },
  clearMocks: true,
};
