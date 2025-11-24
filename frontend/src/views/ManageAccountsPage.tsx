import { useEffect, useState } from "react";
import { columns } from "../components/manageAccounts/ManageAccountsColumns";
import type { Account } from "@/types/Account";
import { ManageAccountsDataTable } from "../components/manageAccounts/ManageAccountsDataTable";
import { getAccounts } from "@/api/manageAccounts";
import { logFrontend } from '../api/logFrontend'; 

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Ensure loading is reset on mount
      logFrontend({
        level: 'INFO',
        message: `Attempting to fetch all user accounts.`,
        component: 'ManageAccountsPage',
        url: window.location.href,
      });

      try {
        const users = await getAccounts();
        setData(users);

        // Log successful fetch
        logFrontend({
          level: 'INFO',
          message: `Successfully loaded ${users.length} user accounts.`,
          component: 'ManageAccountsPage',
          url: window.location.href,
        });
      } catch (error: unknown) {
        console.error("Failed to fetch users:", error);
        
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred during account fetch.";
        
        // Log fetch failure to the backend
        logFrontend({
          level: 'ERROR',
          message: `Data fetch failure: ${errorMessage}`,
          component: 'ManageAccountsPage',
          url: window.location.href,
          stack: error instanceof Error ? error.stack : undefined,
        });
        
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
    // Log the successful update of the UI state after deletion
    logFrontend({
      level: 'INFO',
      message: `UI state updated after batch deletion of ${deletedUserIds.length} users.`,
      component: 'ManageAccountsPage',
      url: window.location.href,
    });
    
    setData((prevData) =>
      prevData.filter((account) => !deletedUserIds.includes(account.id))
    );
  };

  const handleUserUpdate = (updatedUser: Account) => {
    // Log the successful update of the UI state after individual update
    logFrontend({
      level: 'INFO',
      message: `UI state updated after modifying user ID: ${updatedUser.id}.`,
      component: 'ManageAccountsPage',
      url: window.location.href,
    });
    
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
