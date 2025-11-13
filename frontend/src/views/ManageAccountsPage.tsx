import { useEffect, useState } from "react";
import { columns } from "../components/manage-accounts/ManageAccountsColumns";
import type { Account } from "@/types/Account";
import { ManageAccountsDataTable } from "../components/manage-accounts/ManageAccountsDataTable";
import { getAccounts } from "@/api/manageAccounts";

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const users = await getAccounts();

        setData(users);
      } catch (error: unknown) {
        console.error("Failed to fetch users:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleDeleteUsers = (deletedUserIds: number[]) => {
    setData((prevData) =>
      prevData.filter((account) => !deletedUserIds.includes(account.id))
    );
  };

  const handleUserUpdate = (updatedUser: Account) => {
    setData((prevData) =>
      prevData.map((account) =>
        account.id === updatedUser.id ? updatedUser : account
      )
    );
  };

  return (
    <div className="container mx-auto p-6">
      <ManageAccountsDataTable
        columns={columns}
        data={data}
        onDeleteUsers={handleDeleteUsers}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
