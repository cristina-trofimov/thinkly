import axios from "axios";

// Get API URL - works in both Vite and Jest environments
const getApiUrl = (): string => {
  // Check if we're in a Vite environment
  if (typeof window !== 'undefined' && (window as any).VITE_BACKEND_URL) {
    return (window as any).VITE_BACKEND_URL;
  }

  // Try process.env for Jest/Node environments
  if (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL) {
    return process.env.VITE_BACKEND_URL;
  }

  // Default fallback
  return "https://thinkly-production.up.railway.app/";
};

const API_URL = getApiUrl();

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    // Only redirect for protected routes
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/google-auth");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
export { API_URL };