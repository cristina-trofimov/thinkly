"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { ArrowUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Account = {
  id: string;
  name: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

export const columns: ColumnDef<Account>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value);
        }}
        aria-label="Select all"
      />
    ),
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
      const name: string = row.getValue("name");
      const nameSeparated = name.trim().split(" ").filter(Boolean);

      const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? "";
      const lastInitial =
        nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? "";

      const initials = `${firstInitial}${lastInitial}`;

      return (
        <div className="flex text-left font-medium gap-3 items-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-black text-sm font-semibold">
            {initials}
          </span>
          <span>{name}</span>
        </div>
      );
    },
  },
  // deal with the resizing issue later
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
      <div className="text-right font-medium">
        {row.getValue("accountType")}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View User</DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
