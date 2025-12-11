import { logFrontend } from "./api/LoggerAPI";

export const getBackendUrl = (): string => {
  // 1. Try to use Vite's standard environment variables (Browser/Vite)
  // We use a try-catch because accessing import.meta in some non-module environments
  // might throw a syntax error during parsing, though modern bundlers handle this.
  try {
    if (import.meta.env && import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
  } catch (error) {
    logFrontend({
      level: 'WARNING',
      message: `import.meta is not supposed to be used in this environment: ${(error as Error).message}`,
      component: 'config.ts',
      url: window.location.href,
      stack: (error as Error).stack, // Include stack trace for backend logging
    });
    // Ignore errors if import.meta is not supported in the current environment
  }

  // 2. Fallback for Node/Jest environments
  // We check if 'process' is defined to avoid "process is not defined" errors in the browser
  if (typeof process !== 'undefined' && process.env && process.env.VITE_BACKEND_URL) {
    return process.env.VITE_BACKEND_URL;
  }

  // 3. Default fallback
  return 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();