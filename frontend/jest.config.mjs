import { createDefaultPreset } from 'ts-jest';

/** @type {import("jest").Config} */
const tsJestTransformCfg = createDefaultPreset().transform;

export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Remove duplicate, keep only one
  // Move ts-jest config into transform (removes deprecation warning)
  transform: {
    ...tsJestTransformCfg,
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json'
    }],
  },
  globals: {
    'import.meta': {
      env: {
        VITE_BACKEND_URL: 'https://thinkly-production.up.railway.app'
      }
    },
    'ts-jest': {
      "extends": "./tsconfig.json",
      "compilerOptions": {
        "module": "commonjs"
      },
      "include": ["tests/**/*", "src/**/*"]
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@radix-ui)/)',
  ],

  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
};
