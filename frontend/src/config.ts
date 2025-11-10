const getBackendUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  return 'http://localhost:8000'; // fallback for safety
};

export const config = { backendUrl: getBackendUrl() };