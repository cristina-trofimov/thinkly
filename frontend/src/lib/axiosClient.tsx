import axios from "axios";

// Use a function to get the API URL, making it easier to mock in tests
const getApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  }
  // Fallback for non-Vite environments (like Jest)
  return process.env.VITE_BACKEND_URL || "http://localhost:8000";
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


export { API_URL };
export default axiosClient;