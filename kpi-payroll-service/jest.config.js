/** @type {import('jest').Config} */
const config = {
  // Use Node.js environment for backend testing
  testEnvironment: 'node',

  // Match test files in __tests__ directories or files ending with .test.js
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],

  // Exclude node_modules from transformation
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Collect coverage from source files (excluding server entry point)
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'clover'
  ],

  // Force Jest to exit after all tests complete (prevents open handles)
  forceExit: true,

  // Clear mocks between each test
  clearMocks: true,

  // Reset module registry between test files to prevent mock leakage
  resetModules: true,

  // Run test files serially to avoid port exhaustion from parallel property-based tests
  maxWorkers: 1,

  // Verbose output
  verbose: true
};

module.exports = config;
