import {
  getAccounts,
  getAccountsPage,
  deleteAccounts,
  updateAccount,
  getUserPreferences,
  updateUserPreferences,
} from "../src/api/AccountsAPI";

import axiosClient from "../src/lib/axiosClient";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("AccountAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getAccounts
  // -------------------------------------------------------------------------

  describe("getAccounts", () => {
    it("fetches and formats accounts correctly", async () => {
      const backendResponse = [
        {
          user_id: 1,
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@example.com",
          user_type: "admin",
        },
        {
          user_id: 2,
          first_name: "John",
          last_name: "Smith",
          email: "john@example.com",
          user_type: "participant",
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: backendResponse } as any);

      const result = await getAccounts();

      expect(mockedAxios.get).toHaveBeenCalledWith("/manage-accounts/users");
      expect(result).toEqual([
        { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com", accountType: "Admin" },
        { id: 2, firstName: "John", lastName: "Smith", email: "john@example.com", accountType: "Participant" },
      ]);
    });

    it("capitalises 'owner' user_type correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          { user_id: 5, first_name: "Alice", last_name: "K", email: "a@x.com", user_type: "owner" },
        ],
      } as any);

      const result = await getAccounts();
      expect(result[0].accountType).toBe("Owner");
    });

    it("returns empty array when backend returns empty list", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] } as any);
      const result = await getAccounts();
      expect(result).toEqual([]);
    });

    it("rethrows error on failure", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getAccounts()).rejects.toThrow("Network error");
    });
  });

  describe("getAccountsPage", () => {
    it("sends page, page_size, search, user_type, and sort as query params", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 1,
          page: 2,
          page_size: 10,
          items: [
            {
              user_id: 9,
              first_name: "Amy",
              last_name: "Ng",
              email: "amy@example.com",
              user_type: "admin",
            },
          ],
        },
      } as any);

      const result = await getAccountsPage({
        page: 2,
        pageSize: 10,
        search: "amy",
        userType: "admin",
        sort: "email_desc",
      });

      expect(mockedAxios.get).toHaveBeenCalledWith("/manage-accounts/users", {
        params: {
          page: 2,
          page_size: 10,
          search: "amy",
          user_type: "admin",
          sort: "email_desc",
        },
      });
      expect(result).toEqual({
        total: 1,
        page: 2,
        pageSize: 10,
        items: [
          {
            id: 9,
            firstName: "Amy",
            lastName: "Ng",
            email: "amy@example.com",
            accountType: "Admin",
          },
        ],
      });
    });

    it("does not send sort when no sort is selected", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 0,
          page: 1,
          page_size: 25,
          items: [],
        },
      } as any);

      await getAccountsPage();

      expect(mockedAxios.get).toHaveBeenCalledWith("/manage-accounts/users", {
        params: {
          page: 1,
          page_size: 25,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // deleteAccounts
  // -------------------------------------------------------------------------

  describe("deleteAccounts", () => {
    it("calls batch delete endpoint with user IDs", async () => {
      const responseData = {
        status_code: 200,
        deleted_count: 2,
        deleted_users: [{ user_id: 1 }, { user_id: 2 }],
        total_requested: 2,
      };

      mockedAxios.delete.mockResolvedValueOnce({ data: responseData } as any);

      const result = await deleteAccounts([1, 2]);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/manage-accounts/users/batch-delete",
        { data: { user_ids: [1, 2] } }
      );
      expect(result).toEqual(responseData);
    });

    it("includes errors array in response when some IDs are missing", async () => {
      const responseData = {
        status_code: 200,
        deleted_count: 1,
        deleted_users: [{ user_id: 1 }],
        total_requested: 2,
        errors: [{ user_id: 999, error: "User not found." }],
      };

      mockedAxios.delete.mockResolvedValueOnce({ data: responseData } as any);
      const result = await deleteAccounts([1, 999]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].user_id).toBe(999);
    });

    it("sends a single-element array correctly", async () => {
      mockedAxios.delete.mockResolvedValueOnce({
        data: { deleted_count: 1, deleted_users: [{ user_id: 7 }], total_requested: 1, errors: [] },
      } as any);

      await deleteAccounts([7]);
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/manage-accounts/users/batch-delete",
        { data: { user_ids: [7] } }
      );
    });

    it("rethrows error on failure", async () => {
      mockedAxios.delete.mockRejectedValueOnce(new Error("Delete failed"));
      await expect(deleteAccounts([1])).rejects.toThrow("Delete failed");
    });
  });

  // -------------------------------------------------------------------------
  // updateAccount
  // -------------------------------------------------------------------------

  describe("updateAccount", () => {
    it("updates account and formats response", async () => {
      const backendResponse = {
        user_id: 3,
        first_name: "Alice",
        last_name: "Brown",
        email: "alice@example.com",
        user_type: "owner",
      };

      mockedAxios.patch.mockResolvedValueOnce({ data: backendResponse } as any);

      const result = await updateAccount(3, { first_name: "Alice" });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/3",
        { first_name: "Alice" }
      );
      expect(result).toEqual({
        id: 3,
        firstName: "Alice",
        lastName: "Brown",
        email: "alice@example.com",
        accountType: "Owner",
      });
    });

    it("sends multiple fields in a single patch call", async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { user_id: 4, first_name: "Bob", last_name: "Jones", email: "b@x.com", user_type: "participant" },
      } as any);

      await updateAccount(4, { first_name: "Bob", last_name: "Jones" });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/4",
        { first_name: "Bob", last_name: "Jones" }
      );
    });

    it("rethrows error on failure", async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error("Update failed"));
      await expect(updateAccount(1, { first_name: "Bob" })).rejects.toThrow("Update failed");
    });
  });

  // -------------------------------------------------------------------------
  // getUserPreferences (new coverage)
  // -------------------------------------------------------------------------

  describe("getUserPreferences", () => {
    it("fetches preferences for the given user ID", async () => {
      const prefs = { theme: "dark", notifications_enabled: false };
      mockedAxios.get.mockResolvedValueOnce({ data: prefs } as any);

      const result = await getUserPreferences(42);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/manage-accounts/users/42/preferences"
      );
      expect(result).toEqual(prefs);
    });

    it("returns light theme and notifications enabled by default shape", async () => {
      const prefs = { theme: "light", notifications_enabled: true };
      mockedAxios.get.mockResolvedValueOnce({ data: prefs } as any);

      const result = await getUserPreferences(1);
      expect(result.theme).toBe("light");
      expect(result.notifications_enabled).toBe(true);
    });

    it("returns dark theme correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { theme: "dark", notifications_enabled: true },
      } as any);

      const result = await getUserPreferences(2);
      expect(result.theme).toBe("dark");
    });

    it("returns notifications_enabled: false correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { theme: "light", notifications_enabled: false },
      } as any);

      const result = await getUserPreferences(3);
      expect(result.notifications_enabled).toBe(false);
    });

    it("uses the correct user ID in the URL", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { theme: "light", notifications_enabled: true },
      } as any);

      await getUserPreferences(99);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/manage-accounts/users/99/preferences"
      );
    });

    it("rethrows error when preferences fetch fails (e.g. 404)", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Preferences not found."));
      await expect(getUserPreferences(999)).rejects.toThrow("Preferences not found.");
    });

    it("rethrows network errors", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network Error"));
      await expect(getUserPreferences(1)).rejects.toThrow("Network Error");
    });
  });

  // -------------------------------------------------------------------------
  // updateUserPreferences (new coverage)
  // -------------------------------------------------------------------------

  describe("updateUserPreferences", () => {
    it("sends a PATCH to the correct URL with partial fields", async () => {
      const updatedPrefs = { theme: "dark", notifications_enabled: true };
      mockedAxios.patch.mockResolvedValueOnce({ data: updatedPrefs } as any);

      const result = await updateUserPreferences(7, { theme: "dark" });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/7/preferences",
        { theme: "dark" }
      );
      expect(result).toEqual(updatedPrefs);
    });

    it("sends a PATCH with notifications_enabled only", async () => {
      const updatedPrefs = { theme: "light", notifications_enabled: false };
      mockedAxios.patch.mockResolvedValueOnce({ data: updatedPrefs } as any);

      const result = await updateUserPreferences(8, { notifications_enabled: false });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/8/preferences",
        { notifications_enabled: false }
      );
      expect(result.notifications_enabled).toBe(false);
    });

    it("sends both fields together when both are provided", async () => {
      const payload = { theme: "dark" as const, notifications_enabled: false };
      mockedAxios.patch.mockResolvedValueOnce({ data: payload } as any);

      await updateUserPreferences(10, payload);
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/10/preferences",
        payload
      );
    });

    it("returns the server response as the new preferences", async () => {
      const serverResponse = { theme: "dark", notifications_enabled: false };
      mockedAxios.patch.mockResolvedValueOnce({ data: serverResponse } as any);

      const result = await updateUserPreferences(5, { theme: "dark" });
      expect(result.theme).toBe("dark");
      expect(result.notifications_enabled).toBe(false);
    });

    it("uses the correct user ID in the URL", async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { theme: "light", notifications_enabled: true },
      } as any);

      await updateUserPreferences(55, { theme: "light" });
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/manage-accounts/users/55/preferences",
        expect.anything()
      );
    });

    it("rethrows error when update fails (e.g. 400 no fields)", async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error("No fields to update."));
      await expect(updateUserPreferences(1, {})).rejects.toThrow("No fields to update.");
    });

    it("rethrows error when user preferences not found (404)", async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error("Preferences not found."));
      await expect(updateUserPreferences(999, { theme: "light" })).rejects.toThrow("Preferences not found.");
    });

    it("rethrows network errors", async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error("Network Error"));
      await expect(updateUserPreferences(1, { theme: "dark" })).rejects.toThrow("Network Error");
    });
  });
});
