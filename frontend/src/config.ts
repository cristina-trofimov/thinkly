const getBackendUrl = (): string => {
  if (typeof import.meta !== 'undefined') {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  }
  return 'http://localhost:8000';
}

export const config = { backendUrl: getBackendUrl() };
