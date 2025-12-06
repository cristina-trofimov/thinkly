export const getBackendUrl = (): string => {
  let viteEnv: any = {};

  try {
    // Hide 'import.meta' from the CommonJS parser (Jest) by using new Function.
    // This allows the browser/Vite to execute it, but prevents Jest from crashing on SyntaxError.
    viteEnv = new Function('return import.meta.env')();
  } catch (e) {
    // Fails in Jest/Node (CommonJS), safely ignored.
  }

  if (viteEnv?.VITE_BACKEND_URL) {
    return viteEnv.VITE_BACKEND_URL;
  }

  // Fallback for Jest/Node.js environment
  return process.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();


