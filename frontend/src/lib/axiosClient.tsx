// src/lib/axiosClient.tsx
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
  return "http://localhost:8000";
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
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
export { API_URL };