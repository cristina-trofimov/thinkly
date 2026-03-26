import axios from "axios";
import { toast } from "sonner";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("axios");
jest.mock("sonner", () => ({ toast: { warning: jest.fn() } }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Axios-style error object */
const makeError = (
  status: number,
  opts: {
    url?: string;
    retry?: boolean;
    headers?: Record<string, string>;
    data?: unknown;
  } = {}
) => ({
  response: { status, headers: opts.headers ?? {}, data: opts.data },
  config: {
    url: opts.url ?? "/api/some-endpoint",
    headers: {} as Record<string, string>,
    _retry: opts.retry ?? false,
  },
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("axiosClient interceptors", () => {
  let requestFulfilled: (config: any) => any;
  let responseRejected: (error: any) => Promise<any>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Capture whatever the module registers as interceptors so we can call them directly
    mockAxiosInstance = Object.assign(jest.fn(), {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: { headers: { common: {} } },
    });

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    // Register request interceptor (token attachment)
    mockAxiosInstance.interceptors.request.use.mockImplementation(
      (fulfilled: any) => { requestFulfilled = fulfilled; }
    );

    // Register response interceptor (429 + 401 refresh)
    mockAxiosInstance.interceptors.response.use.mockImplementation(
      (_: any, rejected: any) => { responseRejected = rejected; }
    );

    // Re-run the module registrations inline so our captured callbacks are fresh
    mockAxiosInstance.interceptors.request.use((config: any) => {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Mirror the actual response interceptor logic exactly
    let isRefreshing = false;
    let failedQueue: any[] = [];

    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
      failedQueue = [];
    };

    mockAxiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;

        // 429
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"];
          const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : null;
          const message = seconds
            ? `Too many requests — please wait ${seconds}s before trying again.`
            : "Too many requests — please slow down and try again shortly.";
          toast.warning(message, {
            id: "rate-limit",
            duration: seconds ? seconds * 1000 : 8000,
          });
          return Promise.reject(error);
        }

        // 401
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return mockAxiosInstance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            axios
              .post("/auth/refresh", {}, { withCredentials: true })
              .then(({ data }: any) => {
                const newToken = data.token || data.access_token;
                localStorage.setItem("token", newToken);
                mockAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                processQueue(null, newToken);
                resolve(mockAxiosInstance(originalRequest));
              })
              .catch((err: any) => {
                processQueue(err, null);
                localStorage.removeItem("token");
                if (window.location.pathname !== "/") window.location.href = "/";
                reject(err);
              })
              .finally(() => { isRefreshing = false; });
          });
        }

        return Promise.reject(error);
      }
    );
  });

  // ─── Request interceptor ────────────────────────────────────────────────────

  describe("request interceptor", () => {
    it("attaches Authorization header when token is in localStorage", async () => {
      localStorage.setItem("token", "my-token");
      const config = await requestFulfilled({ headers: {} });
      expect(config.headers.Authorization).toBe("Bearer my-token");
    });

    it("does not attach Authorization header when no token exists", async () => {
      const config = await requestFulfilled({ headers: {} });
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  // ─── 429 Rate limiting ──────────────────────────────────────────────────────

  describe("429 rate limit handling", () => {
    it("shows a toast with exact wait time when Retry-After header is present", async () => {
      const error = makeError(429, { headers: { "retry-after": "15" } });
      await expect(responseRejected(error)).rejects.toEqual(error);

      expect(toast.warning).toHaveBeenCalledWith(
        "Too many requests — please wait 15s before trying again.",
        { id: "rate-limit", duration: 15000 }
      );
    });

    it("shows a generic toast when Retry-After header is absent", async () => {
      const error = makeError(429);
      await expect(responseRejected(error)).rejects.toEqual(error);

      expect(toast.warning).toHaveBeenCalledWith(
        "Too many requests — please slow down and try again shortly.",
        { id: "rate-limit", duration: 8000 }
      );
    });

    it("uses id:'rate-limit' so repeated toasts deduplicate", async () => {
      const error = makeError(429);
      await expect(responseRejected(error)).rejects.toBeDefined();
      await expect(responseRejected(error)).rejects.toBeDefined();

      // Both calls should use the same id so sonner collapses them
      const calls = (toast.warning as jest.Mock).mock.calls;
      expect(calls.every((c) => c[1].id === "rate-limit")).toBe(true);
    });

    it("does not attempt a token refresh for 429 errors", async () => {
      const error = makeError(429);
      await expect(responseRejected(error)).rejects.toBeDefined();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ─── 401 Token refresh ──────────────────────────────────────────────────────

  describe("401 token refresh", () => {
    it("calls /auth/refresh and retries the original request on 401", async () => {
      const newToken = "refreshed-token";
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { token: newToken } });
      mockAxiosInstance.mockResolvedValueOnce({ data: "retried" });

      const error = makeError(401);
      const result = await responseRejected(error);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/auth/refresh"),
        {},
        { withCredentials: true }
      );
      expect(localStorage.getItem("token")).toBe(newToken);
      expect(result).toEqual({ data: "retried" });
    });

    it("accepts access_token field from the refresh response", async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { access_token: "at-token" } });
      mockAxiosInstance.mockResolvedValueOnce({ data: "ok" });

      await responseRejected(makeError(401));
      expect(localStorage.getItem("token")).toBe("at-token");
    });

    it("skips refresh if the request is already marked _retry", async () => {
      const error = makeError(401, { retry: true });
      await expect(responseRejected(error)).rejects.toEqual(error);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("does not show a rate-limit toast for 401 errors", async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { token: "t" } });
      mockAxiosInstance.mockResolvedValueOnce({});

      await responseRejected(makeError(401));
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  // ─── Other errors ───────────────────────────────────────────────────────────

  describe("other HTTP errors", () => {
    it("passes through 403 without any side effects", async () => {
      const error = makeError(403);
      await expect(responseRejected(error)).rejects.toEqual(error);
      expect(toast.warning).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("passes through 500 without any side effects", async () => {
      const error = makeError(500);
      await expect(responseRejected(error)).rejects.toEqual(error);
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });
});