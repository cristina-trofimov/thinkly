"use client";

import { Hash, User, Star, ListChecks, Clock } from "lucide-react";
import { NumberCircle } from "@/components/ui/NumberCircle";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Participant = {
  name: string;
  points: number;
  problemsSolved: number;
  totalTime: string;
};

interface Props {
  participants: Participant[];
}

export function ScoreboardDataTable({ participants }: Props) {
  const columns: ColumnDef<Participant>[] = [
    {
      id: "rank",
      header: () => (
        <div className="flex items-center gap-1">
          <Hash className="w-4 h-4 text-gray-500" />
          Rank
        </div>
      ),
      cell: ({ row }) => <NumberCircle number={row.index + 1} />,
    },
    {
      accessorKey: "name",
      header: () => (
        <div className="flex items-center gap-1">
          <User className="w-4 h-4 text-gray-500" />
          Name
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "points",
      header: () => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-gray-500" />
          Total Points
        </div>
      ),
    },
    {
      accessorKey: "problemsSolved",
      header: () => (
        <div className="flex items-center gap-1">
          <ListChecks className="w-4 h-4 text-gray-500" />
          Problems Solved
        </div>
      ),
    },
    {
      accessorKey: "totalTime",
      header: () => (
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-500" />
           Total Time
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: participants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row, idx) => (
              <TableRow
                key={row.id}
                className={
                  idx === 0
                    ? "bg-yellow-100"
                    : idx === 1
                    ? "bg-gray-100"
                    : idx === 2
                    ? "bg-orange-100"
                    : ""
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-6 text-gray-400"
              >
                No participants found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
