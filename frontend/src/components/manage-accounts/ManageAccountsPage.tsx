import { useEffect, useState } from "react";
import { columns } from "./ManageAccountsColumns";
import type { Account } from "./ManageAccountsColumns";
import { ManageAccountsDataTable } from "./ManageAccountsDataTable";
import { config } from "../../config";

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(config.backendUrl + "/users");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const result = await response.json();

        const formattedData: Account[] = result.map((user: any) => ({
          id: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          accountType: user.type,
        }));

        setData(formattedData);
      } catch (error: any) {
        console.error("Failed to fetch users:", error);
        setError(error.message);
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

  const handleDeleteUsers = (deletedUserIds: string[]) => {
    setData(prevData => 
      prevData.filter(account => !deletedUserIds.includes(account.id))
    );
  };

  return (
    <div className="container mx-auto py-10">
      <ManageAccountsDataTable columns={columns} data={data} onDeleteUsers={handleDeleteUsers} />
    </div>
  );
}
