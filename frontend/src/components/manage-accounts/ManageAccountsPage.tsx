import { useEffect, useState } from "react";
import { columns } from "./ManageAccountsColumns";
import type { Account } from "./ManageAccountsColumns";
import { ManageAccountsDataTable } from "./ManageAccountsDataTable";

export default function ManageAccountsPage() {
  const [data, setData] = useState<Account[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getData();
      setData(result);
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <ManageAccountsDataTable columns={columns} data={data} />
    </div>
  );
}
