import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Socket.io if needed or other browser globals
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
