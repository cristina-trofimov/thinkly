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
  withCredentials: true,
});

// Request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables to track refresh state
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        // 1. If refresh is already happening, return a promise that 
        // resolves when the refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
          .then(({ data }) => {
            const newToken = data.token || data.access_token; // Ensure this matches backend
            localStorage.setItem("token", newToken);

            // 2. Refresh headers and process the waiting queue
            axiosClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            processQueue(null, newToken);

            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem("token");

            // 3. ONLY redirect if we are not already on the login page
            if (window.location.pathname !== "/") {
              window.location.href = "/";
            }
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export function parseAxiosErrorMessage(error: unknown): string {
  console.log("BRANDON");
  console.log(error);
  if (axios.isAxiosError(error)) {
    return JSON.stringify(error.response?.data?.detail) || error.message;
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return JSON.stringify(error);
  }
}

export default axiosClient;
export { API_URL };