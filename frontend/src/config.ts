export const getBackendUrl = (): string => {
  // Define the expected shape of the Vite environment
  type ViteEnv = Record<string, string | undefined>;

  let viteEnv: ViteEnv | undefined;

  try {
    // Hide 'import.meta' from the CommonJS parser (Jest) by using new Function.
    // Cast the result to our typed definition.
    viteEnv = new Function('return import.meta.env')() as ViteEnv;
  } catch (e) {
    console.warn(e);
    // Fails in Jest/Node (CommonJS), safely ignored.
  }

  if (viteEnv?.VITE_BACKEND_URL) {
    return viteEnv.VITE_BACKEND_URL;
  }

  // Fallback for Jest/Node.js environment
  return process.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();