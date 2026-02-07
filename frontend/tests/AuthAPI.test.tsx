import {
  login,
  signup,
  googleLogin,
  getProfile,
  logout,
  forgotPassword,
  changePassword,
  isGoogleAccount,
} from "../src/api/AuthAPI";

import axiosClient from "../src/lib/axiosClient";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("AuthAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    const store: Record<string, string> = {};
    jest.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(
      (key: string) => store[key] ?? null
    );
    jest.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(
      (key: string, value: string) => {
        store[key] = value;
      }
    );
    jest.spyOn(window.localStorage.__proto__, "removeItem").mockImplementation(
      (key: string) => {
        delete store[key];
      }
    );
  });

  describe("login", () => {
    it("logs in user", async () => {
      const responseData = { token: "jwt-token" };

      mockedAxios.post.mockResolvedValueOnce({ data: responseData } as any);

      const result = await login({
        email: "test@test.com",
        password: "password",
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/login",
        { email: "test@test.com", password: "password" }
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("signup", () => {
    it("calls signup endpoint", async () => {
      mockedAxios.post.mockResolvedValueOnce({} as any);

      await signup({
        email: "test@test.com",
        password: "password",
        firstName: "Test",
        lastName: "User",
      } as any);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/signup",
        expect.any(Object)
      );
    });
  });

  describe("googleLogin", () => {
    it("logs in with google credential", async () => {
      const responseData = { token: "google-token" };

      mockedAxios.post.mockResolvedValueOnce({ data: responseData } as any);

      const result = await googleLogin("google-credential");

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/google-auth",
        { credential: "google-credential" }
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("getProfile", () => {
    it("fetches and formats user profile", async () => {
      localStorage.setItem("token", "jwt-token");

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 1,
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@test.com",
          role: "admin",
        },
      } as any);

      const result = await getProfile();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/auth/profile",
        {
          headers: {
            Authorization: "Bearer jwt-token",
          },
        }
      );

      expect(result).toEqual({
        id: 1,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        accountType: "admin",
      });
    });

    it("throws if token is missing", async () => {
      await expect(getProfile()).rejects.toThrow(
        "No token found — please log in first."
      );
    });
  });

  describe("logout", () => {
    it("logs out and clears token", async () => {
      localStorage.setItem("token", "jwt-token");

      mockedAxios.post.mockResolvedValueOnce({} as any);

      await logout();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/logout",
        {},
        {
          headers: {
            Authorization: "Bearer jwt-token",
          },
        }
      );

      expect(localStorage.getItem("token")).toBeNull();
    });

    it("throws if token is missing", async () => {
      await expect(logout()).rejects.toThrow("No token found.");
    });
  });

  describe("forgotPassword", () => {
    it("requests password reset", async () => {
      const responseData = { message: "Email sent" };

      mockedAxios.post.mockResolvedValueOnce({ data: responseData } as any);

      const result = await forgotPassword({ email: "test@test.com" });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/forgot-password",
        { email: "test@test.com" }
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("changePassword", () => {
    it("changes password when token exists", async () => {
      localStorage.setItem("token", "jwt-token");

      const responseData = { message: "Password changed" };

      mockedAxios.post.mockResolvedValueOnce({ data: responseData } as any);

      const result = await changePassword({
        old_password: "old",
        new_password: "new",
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/auth/change-password",
        { old_password: "old", new_password: "new" },
        {
          headers: {
            Authorization: "Bearer jwt-token",
          },
        }
      );

      expect(result).toEqual(responseData);
    });

    it("throws if token is missing", async () => {
      await expect(
        changePassword({ old_password: "a", new_password: "b" })
      ).rejects.toThrow("No token found — please log in first.");
    });
  });

  describe("isGoogleAccount", () => {
    it("checks if account is google account", async () => {
      localStorage.setItem("token", "jwt-token");

      const responseData = { isGoogleUser: true };

      mockedAxios.get.mockResolvedValueOnce({ data: responseData } as any);

      const result = await isGoogleAccount();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/auth/is-google-account",
        {
          headers: {
            Authorization: "Bearer jwt-token",
          },
        }
      );

      expect(result).toEqual(responseData);
    });

    it("throws if token is missing", async () => {
      await expect(isGoogleAccount()).rejects.toThrow("No token found.");
    });
  });
});
