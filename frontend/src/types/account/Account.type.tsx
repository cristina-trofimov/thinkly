export type Account = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

export type AccountsApiItem = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: UserType;
};

export type AccountsApiResponse = {
  total: number;
  page: number;
  page_size: number;
  items: AccountsApiItem[];
};

export type UserType = "participant" | "admin" | "owner";