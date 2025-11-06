// tests/setupTests.ts
import '@testing-library/jest-dom';

// Add TextEncoder/TextDecoder polyfills for React Router
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;