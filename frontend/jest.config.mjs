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

  transformIgnorePatterns: [
    'node_modules/(?!(@radix-ui)/)',
  ],

  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
};
