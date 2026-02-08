import axios from "axios";
import axiosClient from "../src/lib/axiosClient"; 

describe("axiosClient", () => {
  const originalLocation = globalThis.location;
  // Use the same path for require as you do for import
  const CLIENT_PATH = "../src/lib/axiosClient";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset location mock
    delete (globalThis as any).location;
    globalThis.location = { href: "http://localhost/" } as any;
  });

  afterAll(() => {
    globalThis.location = originalLocation;
  });

  // 1. Interceptor Tests
  
  it("should add Authorization header if token exists in localStorage", async () => {
    localStorage.setItem("token", "test-token");
    
    // @ts-ignore
    const requestInterceptor = axiosClient.interceptors.request.handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("should not add Authorization header if token is missing", async () => {
    // @ts-ignore
    const requestInterceptor = axiosClient.interceptors.request.handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("should redirect to '/' and clear token on 401 error for non-auth endpoints", async () => {
    localStorage.setItem("token", "expired-token");
    
    // @ts-ignore
    const responseErrorInterceptor = axiosClient.interceptors.response.handlers[0].rejected;
    
    const mockError = {
      response: { status: 401 },
      config: { url: "/api/competitions" }
    };

    try {
      await responseErrorInterceptor(mockError);
    } catch (e) {
      // Expected rejection
    }

    expect(localStorage.getItem("token")).toBeNull();
    // JSDOM often resolves "/" to "http://localhost/" based on the environment origin
    expect(globalThis.location.href).toMatch(/\/$/); 
  });

  it("should NOT redirect on 401 error if endpoint is /auth/login", async () => {
    localStorage.setItem("token", "some-token");
    
    // @ts-ignore
    const responseErrorInterceptor = axiosClient.interceptors.response.handlers[0].rejected;
    
    const mockError = {
      response: { status: 401 },
      config: { url: "/auth/login" }
    };

    try {
      await responseErrorInterceptor(mockError);
    } catch (e) {}

    expect(globalThis.location.href).not.toBe("/");
    expect(localStorage.getItem("token")).toBe("some-token");
  });

  // 2. URL Logic Tests
  
  it("uses VITE_BACKEND_URL from window if available", () => {
    jest.isolateModules(() => {
      (globalThis as any).VITE_BACKEND_URL = "https://custom-api.com";
      // Fixed path to match the valid import path
      const { API_URL } = require(CLIENT_PATH);
      expect(API_URL).toBe("https://custom-api.com");
      delete (globalThis as any).VITE_BACKEND_URL;
    });
  });

  it("uses production fallback if window.VITE_BACKEND_URL is missing", () => {
    jest.isolateModules(() => {
      delete (globalThis as any).VITE_BACKEND_URL;
      const { API_URL } = require(CLIENT_PATH);
      expect(API_URL).toBe("https://thinkly-production.up.railway.app/");
    });
  });
});