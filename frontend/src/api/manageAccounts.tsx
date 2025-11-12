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
      id: String(user.user_id),
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
