import { useEffect, useState } from "react";
import { columns } from "../../components/manageAccounts/ManageAccountsColumns";
import type { Account } from "@/types/account/Account.type";
import { ManageAccountsDataTable } from "../../components/manageAccounts/ManageAccountsDataTable";
import { getAccountsPage, type AccountsSort } from "@/api/AccountsAPI";
import { logFrontend } from "../../api/LoggerAPI";
import { useAnalytics } from "@/hooks/useAnalytics";
import ManageAccountsTableSkeleton from "@/components/manageAccounts/ManageAccountsSkeleton";
import { useUser } from "@/context/UserContext";

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState<string>("");
  const [userTypeFilter, setUserTypeFilter] = useState<
    "all" | "owner" | "admin" | "participant"
  >("all");
  const [sort, setSort] = useState<AccountsSort | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const { user : currentUser } = useUser();

  const {
    trackAdminAccountsViewed,
    trackAdminAccountsBatchDeleted,
    trackAdminAccountUpdated,
  } = useAnalytics();

  useEffect(() => {
    const getAllAccounts = async () => {
      setLoading(true);
      setError(null);
      logFrontend({
        level: "INFO",
        message: `Attempting to fetch accounts page=${page}, pageSize=${pageSize}, search=${search || "none"}, userType=${userTypeFilter}.`,
        component: "ManageAccountsPage",
        url: globalThis.location.href,
      });

      try {
        const rawResult = (await getAccountsPage({
          page,
          pageSize,
          search,
          userType: userTypeFilter === "all" ? undefined : userTypeFilter,
          sort,
        })) as unknown;

        const result = Array.isArray(rawResult)
          ? { total: rawResult.length, page, pageSize, items: rawResult }
          : (rawResult as {
              total: number;
              page: number;
              pageSize: number;
              items: Account[];
            });
        setData(result.items);
        setTotal(result.total);

        if (result.items.length === 0 && result.total > 0 && page > 1) {
          setPage(page - 1);
          return;
        }

        // Track page view once data is loaded so we can attach account_count
        trackAdminAccountsViewed(result.total);

        logFrontend({
          level: "INFO",
          message: `Successfully loaded ${result.items.length} user accounts (total=${result.total}, sort=${sort}).`,
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
        setHasLoadedOnce(true);
        setLoading(false);
      }
    };
    getAllAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sort, userTypeFilter, refreshToken]);

  if (loading && !hasLoadedOnce) {
    return <ManageAccountsTableSkeleton />;
  }
  if (error) {
    return <div>Something went wrong. Please try again.</div>;
  }

  const handleDeleteUsers = (deletedUserIds: number[]) => {
    trackAdminAccountsBatchDeleted(deletedUserIds.length);

    logFrontend({
      level: "INFO",
      message: `UI state updated after batch deletion of ${deletedUserIds.length} users.`,
      component: "ManageAccountsPage",
      url: globalThis.location.href,
    });

    setData((prevData) => prevData.filter((account) => !deletedUserIds.includes(account.id)));
    setTotal((prevTotal) => Math.max(0, prevTotal - deletedUserIds.length));
    setRefreshToken((prev) => prev + 1);
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
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        userTypeFilter={userTypeFilter}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onUserTypeFilterChange={(value) => {
          setPage(1);
          setUserTypeFilter(value);
        }}
        onSortChange={(value) => {
          setPage(1);
          setSort(value);
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPage(1);
          setPageSize(value);
        }}
        onDeleteUsers={handleDeleteUsers}
        onUserUpdate={handleUserUpdate}
        currentUserRole={currentUser?.accountType}
      />
    </div>
  );
}
