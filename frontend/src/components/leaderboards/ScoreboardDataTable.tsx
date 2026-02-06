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
import type { Participant } from "../../types/account/Participant.type";

interface Props {
  readonly participants: Participant[];
  readonly currentUserId?: number;
  readonly showSeparator?: boolean;
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

// --- Helper for row background color based on rank ---
const getRowBgClass = (rank: number) => {
  if (rank === 1) return "bg-yellow-100";
  if (rank === 2) return "bg-gray-100";
  if (rank === 3) return "bg-orange-100";
  return "";
};

const RankCellRenderer = (props: CellContext<Participant, unknown>) => {
  return <NumberCircle number={props.row.original.rank} />;
};

const NameCellRenderer = (props: CellContext<Participant, unknown>) => {
  return <span className="font-medium">{props.row.original.name}</span>;
};

export function ScoreboardDataTable({ participants, currentUserId, showSeparator = false }: Props) {
  console.log("ScoreboardDataTable - Participants:", participants.length, "Current User ID:", currentUserId, "Show Separator:", showSeparator);
  console.log("Participant user IDs:", participants.map(p => p.user_id));

  const columns: ColumnDef<Participant>[] = [
    {
      id: "rank",
      header: RankHeader,
      cell: RankCellRenderer,
    },
    {
      accessorKey: "name",
      header: NameHeader,
      cell: NameCellRenderer,
    },
    {
      accessorKey: "total_score",
      header: PointsHeader,
    },
    {
      accessorKey: "problems_solved",
      header: ProblemsSolvedHeader,
    },
    {
      accessorKey: "total_time",
      header: TotalTimeHeader,
    }
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
            <>
              {table.getRowModel().rows.map((row, idx) => {
                const isCurrentUser = currentUserId && row.original.user_id === currentUserId;
                const rank = row.original.rank;

                // If current user, use purple highlight, otherwise use podium colors based on rank
                const rowClass = isCurrentUser
                  ? "bg-[#8065CD]/20 border-t-2 border-b-2 border-[#8065CD] font-semibold"
                  : getRowBgClass(rank);

                // Insert separator after rank 10 (when we transition from top 10 to user context)
                // This happens when showSeparator is true and current row has rank 10
                const shouldShowSeparator = showSeparator && rank === 10;

                return (
                  <>
                    <TableRow
                      key={row.id}
                      className={rowClass}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {shouldShowSeparator && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell colSpan={5} className="text-center py-2 text-gray-400">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl">. . .</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </>
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