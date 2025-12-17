import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js test environment
// Required for Web Crypto API and string encoding
Object.assign(global, { TextEncoder, TextDecoder });
