// Use a function to safely access import.meta only in environments that support it
const getBackendUrl = (): string => {
  if (typeof import.meta !== 'undefined') {
    return (import.meta.env as any).VITE_BACKEND_URL || 'http://localhost:8000';
  }
  return 'http://localhost:8000'; // fallback for safety
};

export const config = { backendUrl: getBackendUrl() };
