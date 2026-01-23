// tests/setupTests.ts
import '@testing-library/jest-dom';

process.env.VITE_BACKEND_URL = 'https://thinkly-production.up.railway.app/';
// Add TextEncoder/TextDecoder polyfills for React Router
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;