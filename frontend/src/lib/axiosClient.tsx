import axios from "axios";

const getApiUrl = (): string => {
  // retrieve .env VITE_BACKEND_URL variable if exists (for development)
  // NOSONAR: import.meta is provided by Vite build system
  const url = import.meta.env.VITE_BACKEND_URL
  if (url) {
    return url;
  }

  // 2. Fallback for production
  return "https://thinkly-production.up.railway.app/";
};

const API_URL = getApiUrl();

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
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