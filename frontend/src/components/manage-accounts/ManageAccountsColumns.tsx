"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarInitials } from "../AvatarInitials";
import { ActionsCell } from "./UserActionsCell";
import type { Account } from "@/types/Account";

export const columns: ColumnDef<Account>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected();
      const isSomeSelected = table.getIsSomeRowsSelected();

      const checkedState = isAllSelected
        ? true
        : isSomeSelected
        ? "indeterminate"
        : false;

      return (
        <Checkbox
          checked={checkedState}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: () => <div className="text-left">Name</div>,
    cell: ({ row }) => {
      const name: string = row.original.firstName + " " + row.original.lastName;

      return (
        <div className="flex text-left font-medium gap-3 items-center">
          <AvatarInitials
            firstName={row.original.firstName}
            lastName={row.original.lastName}
            size="md"
          />
          <span className="font-semibold">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="text-left font-medium">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "accountType",
    header: () => <div className="text-right">Account Type</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium italic">
        {row.getValue("accountType")}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const user = row.original;
      const onUserUpdate = table.options.meta?.onUserUpdate;

      return <ActionsCell user={user} onUserUpdate={onUserUpdate} />;
    },
  },
];
