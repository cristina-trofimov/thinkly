import axiosClient from "@/lib/axiosClient";
import type { Account } from "../components/manage-accounts/ManageAccountsColumns";
import { config } from "../config";

export async function getAccounts(): Promise<Account[]> {
  try {
    const response = await axiosClient.get<
      {
        user_id: number;
        first_name: string;
        last_name: string;
        email: string;
        type: "Participant" | "Admin" | "Owner";
      }[]
    >(`${config.backendUrl}/manage-accounts/users`);

    const formattedAccounts: Account[] = response.data.map((user) => ({
      id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      accountType: user.type,
    }));

    return formattedAccounts;
  } catch (err) {
    console.error("Error fetching accounts:", err);
    throw err;
  }
}

export async function deleteAccounts(userIds: number[]): Promise<{
  status_code: number;
  deleted_count: number;
  deleted_users: Array<{ user_id: number }>;
  total_requested: number;
  errors?: Array<{ user_id: number; error: string }>;
}> {
  try {
    const response = await axiosClient.delete(
      "manage-accounts/users/batch-delete",
      {
        data: { user_ids: userIds.map((id) => id) },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Error deleting users:", err);
    throw err;
  }
}
