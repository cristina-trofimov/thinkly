import axios from "axios";

const getApiUrl = (): string => {
  // 1. Check for Vite environment variables (Local .env or Netlify Build settings)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // 2. Fallback for production if everything else fails
  return "https://thinkly-production.up.railway.app/";
};


const API_URL = getApiUrl();

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
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
      globalThis.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
export { API_URL };