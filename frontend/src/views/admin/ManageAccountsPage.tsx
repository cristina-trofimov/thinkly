import { useEffect, useState } from "react";
import { columns } from "../../components/manageAccounts/ManageAccountsColumns";
import type { Account } from "@/types/account/Account.type";
import { ManageAccountsDataTable } from "../../components/manageAccounts/ManageAccountsDataTable";
import { getAccounts } from "@/api/AccountsAPI";
import { logFrontend } from "../../api/LoggerAPI";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const {
    trackAdminAccountsViewed,
    trackAdminAccountsBatchDeleted,
    trackAdminAccountUpdated,
  } = useAnalytics();

  useEffect(() => {
    const getAllAccounts = async () => {
      setLoading(true);
      logFrontend({
        level: "INFO",
        message: `Attempting to fetch all user accounts.`,
        component: "ManageAccountsPage",
        url: globalThis.location.href,
      });

      try {
        const users = await getAccounts();
        setData(users);

        // Track page view once data is loaded so we can attach account_count
        trackAdminAccountsViewed(users.length);

        logFrontend({
          level: "INFO",
          message: `Successfully loaded ${users.length} user accounts.`,
          component: "ManageAccountsPage",
          url: globalThis.location.href,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unknown error occurred during account fetch.";

        logFrontend({
          level: "ERROR",
          message: `Data fetch failure: ${errorMessage}`,
          component: "ManageAccountsPage",
          url: globalThis.location.href,
          stack: error instanceof Error ? error.stack : undefined,
        });

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    getAllAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleDeleteUsers = (deletedUserIds: number[]) => {
    trackAdminAccountsBatchDeleted(deletedUserIds.length);

    logFrontend({
      level: "INFO",
      message: `UI state updated after batch deletion of ${deletedUserIds.length} users.`,
      component: "ManageAccountsPage",
      url: globalThis.location.href,
    });

    setData((prevData) =>
      prevData.filter((account) => !deletedUserIds.includes(account.id))
    );
  };

  const handleUserUpdate = (updatedUser: Account) => {
    trackAdminAccountUpdated(updatedUser.id, updatedUser.accountType);

    logFrontend({
      level: "INFO",
      message: `UI state updated after modifying user ID: ${updatedUser.id}.`,
      component: "ManageAccountsPage",
      url: globalThis.location.href,
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