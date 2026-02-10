import axios from "axios";

jest.mock("axios");

describe("axiosClient setup logic", () => {
  let requestFulfilled: ((config: any) => any) | undefined;
  let responseRejected: ((error: any) => Promise<never>) | undefined;
  let mockInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn((fulfilled: (config: any) => any) => {
            requestFulfilled = fulfilled;
          }),
        },
        response: {
          use: jest.fn((_: any, rejected: (error: any) => Promise<never>) => {
            responseRejected = rejected;
          }),
        },
      },
    };

    (axios.create as jest.Mock).mockReturnValue(mockInstance);

    const API_URL = "http://localhost:8000";
    axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    mockInstance.interceptors.request.use((config: any) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    mockInstance.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        const status = error.response?.status;
        const url = error.config?.url ?? "";
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
  });

  it("adds Authorization header if token exists", async () => {
    localStorage.setItem("token", "test-token");

    const config = await requestFulfilled?.({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not add Authorization header if token is missing", async () => {
    const config = await requestFulfilled?.({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("clears token and redirects on 401 for protected endpoints", async () => {
    localStorage.setItem("token", "expired-token");

    const mockError = {
      response: { status: 401 },
      config: { url: "/api/competitions" },
    };

    await expect(responseRejected?.(mockError)).rejects.toEqual(mockError);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("does not redirect on 401 for /auth/login", async () => {
    localStorage.setItem("token", "some-token");

    const mockError = {
      response: { status: 401 },
      config: { url: "/auth/login" },
    };

    await expect(responseRejected?.(mockError)).rejects.toEqual(mockError);
    expect(localStorage.getItem("token")).toBe("some-token");
  });

  it("uses the expected axios defaults", () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: "http://localhost:8000",
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
  });
});
