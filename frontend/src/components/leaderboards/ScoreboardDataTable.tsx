"use client";

import { Hash, User, Star, ListChecks, Clock } from "lucide-react";
import { NumberCircle } from "@/components/ui/NumberCircle";
import {
  type ColumnDef,
  type CellContext,
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
import type { Participant } from "../interfaces/Participant";

interface Props {
  readonly participants: Participant[];
}

// --- Move headers and cells out of parent component ---
const RankHeader = () => (
  <div className="flex items-center gap-1">
    <Hash className="w-4 h-4 text-gray-500" />
    Rank
  </div>
);

const NameHeader = () => (
  <div className="flex items-center gap-1">
    <User className="w-4 h-4 text-gray-500" />
    Name
  </div>
);


const PointsHeader = () => (
  <div className="flex items-center gap-1">
    <Star className="w-4 h-4 text-gray-500" />
    Total Points
  </div>
);

const ProblemsSolvedHeader = () => (
  <div className="flex items-center gap-1">
    <ListChecks className="w-4 h-4 text-gray-500" />
    Problems Solved
  </div>
);

const TotalTimeHeader = () => (
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4 text-gray-500" />
    Total Time
  </div>
);


// --- Helper for row background color ---
const getRowBgClass = (idx: number) => {
  if (idx === 0) return "bg-yellow-100";
  if (idx === 1) return "bg-gray-100";
  if (idx === 2) return "bg-orange-100";
  return "";
};
const RankCellRenderer = (props: CellContext<Participant, unknown>) => {
  return <NumberCircle number={props.row.index + 1} />;
};

const NameCellRenderer = (props: CellContext<Participant, unknown>) => {
  return <span className="font-medium">{props.row.original.username}</span>;
};

export function ScoreboardDataTable({ participants }: Props) {
  const columns: ColumnDef<Participant>[] = [
    {
      id: "rank",
      header: RankHeader,
      cell: RankCellRenderer, // just pass the component
    },
    {
      accessorKey: "name",
      header: NameHeader,
      cell: NameCellRenderer, // just pass the component
    },
    {
      accessorKey: "points",
      header: PointsHeader,
    },
    {
      accessorKey: "problemsSolved",
      header: ProblemsSolvedHeader,
    },
    {
      accessorKey: "totalTime",
      header: TotalTimeHeader,
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
              <TableRow key={row.id} className={getRowBgClass(idx)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
