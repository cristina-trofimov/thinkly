import axiosClient from "@/lib/axiosClient";
import type { Account } from "@/types/account/Account.type";

// Backend user type value for accountAPI.
// this is because the backend uses lowercase values while frontend capitalizes the first  letter
type UserType = "participant" | "admin" | "owner";
export type AccountsSort =
  | "name_asc"
  | "name_desc"
  | "email_asc"
  | "email_desc";

const formatAccountType = (userType: UserType): Account["accountType"] => {
  return (userType.charAt(0).toUpperCase() +
    userType.slice(1)) as Account["accountType"];
};

type AccountsApiItem = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: UserType;
};

type AccountsApiResponse = {
  total: number;
  page: number;
  page_size: number;
  items: AccountsApiItem[];
};

const mapAccount = (user: AccountsApiItem): Account => ({
  id: user.user_id,
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  accountType: formatAccountType(user.user_type),
});

export async function getAccounts(): Promise<Account[]> {
  try {
    const firstPage = await getAccountsPage();
    return firstPage.items;
  } catch (err) {
    console.error("Error fetching accounts:", err);
    throw err;
  }
}

export interface AccountsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  userType?: UserType;
  sort?: AccountsSort;
}

export interface AccountsPage {
  total: number;
  page: number;
  pageSize: number;
  items: Account[];
}

export async function getAccountsPage(
  params: AccountsQueryParams = {}
): Promise<AccountsPage> {
  const { page = 1, pageSize = 25, search, userType, sort } = params;
  const queryParams: Record<string, string | number> = {
    page,
    page_size: pageSize,
  };

  if (search?.trim()) queryParams.search = search.trim();
  if (userType) queryParams.user_type = userType;
  if (sort) queryParams.sort = sort;

  const response = await axiosClient.get<AccountsApiResponse>("/manage-accounts/users", {
    params: queryParams,
  });

  return {
    total: response.data.total,
    page: response.data.page,
    pageSize: response.data.page_size,
    items: response.data.items.map(mapAccount),
  };
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
      "/manage-accounts/users/batch-delete",
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

export async function updateAccount(
  userId: number,
  updatedFields: Record<string, string>
): Promise<Account> {
  try {
    const updatedAccount = await axiosClient.patch<{
      user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      user_type: UserType;
    }>(`/manage-accounts/users/${userId}`, updatedFields);

    const formattedAccounts: Account = {
      id: updatedAccount.data.user_id,
      firstName: updatedAccount.data.first_name,
      lastName: updatedAccount.data.last_name,
      email: updatedAccount.data.email,
      accountType: formatAccountType(updatedAccount.data.user_type),
    };

    return formattedAccounts;
  } catch (err) {
    console.error("Error updating user:", err);
    throw err;
  }
}

export interface UserPreferences {
  theme: "light" | "dark";
  notifications_enabled: boolean;
}

export async function getUserPreferences(userId: number): Promise<UserPreferences> {
  try {
    const response = await axiosClient.get<UserPreferences>(
      `/manage-accounts/users/${userId}/preferences`
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching user preferences:", err);
    throw err;
  }
}

export async function updateUserPreferences(
  userId: number,
  updatedFields: Partial<UserPreferences>
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.patch<UserPreferences>(
      `/manage-accounts/users/${userId}/preferences`,
      updatedFields
    );
    return response.data;
  } catch (err) {
    console.error("Error updating user preferences:", err);
    throw err;
  }
}
