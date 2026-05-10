/**
 * @file src/test/setup.ts
 * @description Global configuration and environmental setup for the Vitest test suite.
 * Includes necessary polyfills and global mocks for browser-specific APIs.
 * @importance Essential: Ensures a stable and predictable environment for running automated tests.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Socket.io if needed or other browser globals
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
