"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Question } from "@/types/questions/Question.type";

export const columns: ColumnDef<Question>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected();
      const isSomeSelected = table.getIsSomeRowsSelected();

      let checkedState: boolean | "indeterminate" = false;

      if (isAllSelected) {
        checkedState = true;
      } else if (isSomeSelected) {
        checkedState = "indeterminate";
      }

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
      accessorKey: "title",
      header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    
    cell: ({ row }) => {
      const name: string = row.original.title;

      return (
        <div className="text-left font-medium italic">
            {name}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: () => <div className="text-left">Description</div>,
    cell: ({ row }) => (
      <div
        className="max-w-[200px] truncate text-left font-medium"
        title={row.getValue("description")}
      >{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "difficulty",
    header: ({ column }) => {
        return (
            <div className="text-left">
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Difficulty
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        );
    },
    cell: ({ row }) => (
      <div className="text-left font-medium italic">
        {(row.getValue<string>("difficulty")).replace(/^\w/, (c) => c.toUpperCase())}
      </div>
    ),
  }
];
