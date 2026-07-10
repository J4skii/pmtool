/**
 * Unit tests only — Playwright owns e2e/*.spec.ts (run via `pnpm test:e2e`).
 */
module.exports = {
  // 'jsdom' needs the jest-environment-jsdom package; switch when the first
  // DOM-dependent unit test lands.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.next/'],
  passWithNoTests: true,
};
