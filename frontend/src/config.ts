// Use a function to safely access import.meta only in environments that support it
const getBackendUrl = (): string => {
  if (typeof window !== 'undefined' && 'VITE_BACKEND_URL' in (import.meta as any).env) {
    return (import.meta as any).env.VITE_BACKEND_URL;
  }
  return process.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

export const config = {
  backendUrl: getBackendUrl(),
};