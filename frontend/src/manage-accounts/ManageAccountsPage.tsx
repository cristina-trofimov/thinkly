import { useEffect, useState } from "react";
import { columns } from "./ManageAccountsColumns";
import type { Account } from "./ManageAccountsColumns";
import { ManageAccountsDataTable } from "./ManageAccountsDataTable";

function getData(): Promise<Account[]> {
// hardcoded data for now until backend is ready
  return Promise.resolve([
    {
      id: "728ed52f",
      name: "John Doe",
      email: "m@example.com",
      accountType: "Participant",
    },
    {
      id: "45104981",
      name: "Hannah Wilson",
      email: "hwilson@example.com",
      accountType: "Admin",
    },
    {
      id: "aac7ee24",
      name: "Eva Smith",
      email: "esmith@example.com",
      accountType: "Participant",
    },
    {
      id: "de028c21",
      name: "Hannah Wilson",
      email: "hwilson@mail.com",
      accountType: "Admin",
    },
    {
      id: "0858b39d",
      name: "Charlie Anderson",
      email: "canderson@demo.com",
      accountType: "Participant",
    },
    {
      id: "a8f602f9",
      name: "Hannah Johnson",
      email: "hjohnson@test.com",
      accountType: "Participant",
    },
    {
      id: "3caf9f84",
      name: "Charlie Anderson",
      email: "canderson@test.com",
      accountType: "Admin",
    },
    {
      id: "d15fd17f",
      name: "John Johnson",
      email: "jjohnson@test.com",
      accountType: "Participant",
    },
    {
      id: "22afd9f6",
      name: "Charlie Anderson",
      email: "canderson@demo.com",
      accountType: "Participant",
    },
    {
      id: "95bb23c7",
      name: "Alice Brown",
      email: "abrown@demo.com",
      accountType: "Participant",
    },
    {
      id: "5aa2edbd",
      name: "Frank Thomas",
      email: "fthomas@test.com",
      accountType: "Participant",
    },
    {
      id: "28a3a12c",
      name: "Charlie Johnson",
      email: "cjohnson@mail.com",
      accountType: "Admin",
    },
    {
      id: "e6e70d27",
      name: "Hannah Wilson",
      email: "hwilson@example.com",
      accountType: "Admin",
    },
    {
      id: "65730960",
      name: "Bob Miller",
      email: "bmiller@demo.com",
      accountType: "Participant",
    },
    {
      id: "2fa0dea5",
      name: "Charlie Wilson",
      email: "cwilson@test.com",
      accountType: "Admin",
    },
    {
      id: "315002cf",
      name: "John Miller",
      email: "jmiller@example.com",
      accountType: "Admin",
    },
    {
      id: "bbb021a7",
      name: "Grace Thomas",
      email: "gthomas@test.com",
      accountType: "Admin",
    },
    {
      id: "4ffb2088",
      name: "Grace Johnson",
      email: "gjohnson@mail.com",
      accountType: "Admin",
    },
    {
      id: "7bc6b934",
      name: "Hannah Taylor",
      email: "htaylor@example.com",
      accountType: "Admin",
    },
    {
      id: "78da7de1",
      name: "Jane Anderson",
      email: "janderson@demo.com",
      accountType: "Participant",
    },
    {
      id: "73898d3e",
      name: "Alice Taylor",
      email: "ataylor@mail.com",
      accountType: "Admin",
    },
    {
      id: "fb1970b0",
      name: "Charlie Thomas",
      email: "cthomas@test.com",
      accountType: "Participant",
    },
    {
      id: "60782f91",
      name: "Grace Anderson",
      email: "ganderson@demo.com",
      accountType: "Admin",
    },
    {
      id: "0bbcf24d",
      name: "Eva Davis",
      email: "edavis@test.com",
      accountType: "Admin",
    },
    {
      id: "f625aa10",
      name: "Frank Brown",
      email: "fbrown@test.com",
      accountType: "Participant",
    },
    {
      id: "789904df",
      name: "Jane Miller",
      email: "jmiller@test.com",
      accountType: "Participant",
    },
    {
      id: "5237dd8e",
      name: "Grace Smith",
      email: "gsmith@demo.com",
      accountType: "Participant",
    },
    {
      id: "70b5e21c",
      name: "Bob Thomas",
      email: "bthomas@example.com",
      accountType: "Admin",
    },
    {
      id: "8323b1c0",
      name: "John Wilson",
      email: "jwilson@example.com",
      accountType: "Participant",
    },
    {
      id: "a4aa7bfb",
      name: "John Davis",
      email: "jdavis@test.com",
      accountType: "Admin",
    },
    {
      id: "91d04f0c",
      name: "John Taylor",
      email: "jtaylor@test.com",
      accountType: "Owner",
    },
  ]);
}

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
