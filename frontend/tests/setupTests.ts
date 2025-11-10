// tests/setupTests.ts
import '@testing-library/jest-dom';

process.env.VITE_BACKEND_URL = 'http://localhost:8000';
// Add TextEncoder/TextDecoder polyfills for React Router
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;