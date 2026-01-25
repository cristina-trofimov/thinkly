import {
  getAccounts,
  deleteAccounts,
  updateAccount,
} from "../src/api/AccountsAPI";

import axiosClient from "../src/lib/axiosClient";

jest.mock("@/lib/axiosClient");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("AccountAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

      mockedAxios.get.mockResolvedValueOnce({
        data: backendResponse,
      } as any);

      const result = await getAccounts();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/manage-accounts/users"
      );

      expect(result).toEqual([
        {
          id: 1,
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          accountType: "Admin",
        },
        {
          id: 2,
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com",
          accountType: "Participant",
        },
      ]);
    });

    it("rethrows error on failure", async () => {
      const error = new Error("Network error");

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getAccounts()).rejects.toThrow("Network error");
    });
  });

  describe("deleteAccounts", () => {
    it("calls batch delete endpoint with user IDs", async () => {
      const responseData = {
        status_code: 200,
        deleted_count: 2,
        deleted_users: [{ user_id: 1 }, { user_id: 2 }],
        total_requested: 2,
      };

      mockedAxios.delete.mockResolvedValueOnce({
        data: responseData,
      } as any);

      const result = await deleteAccounts([1, 2]);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/manage-accounts/users/batch-delete",
        {
          data: { user_ids: [1, 2] },
        }
      );

      expect(result).toEqual(responseData);
    });

    it("rethrows error on failure", async () => {
      const error = new Error("Delete failed");

      mockedAxios.delete.mockRejectedValueOnce(error);

      await expect(deleteAccounts([1])).rejects.toThrow("Delete failed");
    });
  });

  describe("updateAccount", () => {
    it("updates account and formats response", async () => {
      const backendResponse = {
        user_id: 3,
        first_name: "Alice",
        last_name: "Brown",
        email: "alice@example.com",
        user_type: "owner",
      };

      mockedAxios.patch.mockResolvedValueOnce({
        data: backendResponse,
      } as any);

      const result = await updateAccount(3, {
        first_name: "Alice",
      });

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

    it("rethrows error on failure", async () => {
      const error = new Error("Update failed");

      mockedAxios.patch.mockRejectedValueOnce(error);

      await expect(
        updateAccount(1, { first_name: "Bob" })
      ).rejects.toThrow("Update failed");
    });
  });
});
