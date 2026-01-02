/**
 * Vitest Setup File
 * Runs before all tests to set up global test utilities and mocks
 */

import { vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageMock.store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

global.localStorage = localStorageMock;

// Mock console methods to reduce test noise (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   warn: vi.fn(),
// };

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.store = {};
  vi.clearAllMocks();
});
