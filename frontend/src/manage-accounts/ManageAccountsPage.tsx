import { useEffect, useState } from 'react';
import { columns } from "./ManageAccountsColumns";
import type { Payment } from "./ManageAccountsColumns";
import { ManageAccountsDataTable } from "./ManageAccountsDataTable";

function getData(): Promise<Payment[]> {
  // Fetch data from your API here.
  return Promise.resolve([
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
    },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    //  {
    //   id: "728ed52f",
    //   amount: 100,
    //   status: "pending",
    //   email: "m@example.com",
    // },
    {
      id: "728ed52f",
      amount: 1003432434234324324324234234234234234342,
      status: "pending",
      email: "m@bye.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@hello.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@too.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@dfkjhfjksd.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@dosfsd.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@ASA.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@well.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@sdsd.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@sdsdsdaaa.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@qwe.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@rty.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@tyuihj.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@yeyeyeye.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@qwee.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@weee.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@wqqqq.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@tuuu.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@puo.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@bell.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@1234.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@444566.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@pouts.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@blame.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@hello.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@byee.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@whatup.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@tree.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@forrest.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@plant.com",
    },
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@blank.com",
    },
    // ...
  ]);
}

export default function ManageAccountsPage() {
  const [data, setData] = useState<Payment[]>([]);

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