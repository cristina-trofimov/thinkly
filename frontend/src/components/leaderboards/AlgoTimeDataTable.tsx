"use client";

import React from "react";

import { ChevronLeft, ChevronRight, Search, Hash, User, Star, ListChecks, Clock } from "lucide-react";
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
  readonly loading?: boolean;
  // Search — controlled by parent (AlgoTimeCard), executed on the backend
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  // Pagination — controlled by parent; page numbers are 1-based
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

// ─── Column headers ───────────────────────────────────────────────────────────

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

// ─── Cell renderers ───────────────────────────────────────────────────────────

const getRowBgClass = (rank: number) => {
  if (rank === 1) return "bg-yellow-100";
  if (rank === 2) return "bg-gray-100";
  if (rank === 3) return "bg-orange-100";
  return "";
};

const RankCellRenderer = (props: CellContext<Participant, unknown>) => (
  <NumberCircle number={props.row.original.rank} />
);

const NameCellRenderer = (props: CellContext<Participant, unknown>) => (
  <span className="font-medium">{props.row.original.name}</span>
);

// ─── Table body renderer ──────────────────────────────────────────────────────

function renderTableBody(
  loading: boolean,
  rows: ReturnType<ReturnType<typeof useReactTable<Participant>>["getRowModel"]>["rows"],
  columns: ColumnDef<Participant>[],
  currentUserId: number | undefined,
  search: string
): React.ReactNode {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="text-center py-8 text-gray-400">
          Loading...
        </TableCell>
      </TableRow>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="text-center py-6 text-gray-400">
          {search ? "No participants match your search" : "No participants found"}
        </TableCell>
      </TableRow>
    );
  }

  return rows.map((row) => {
    const isCurrentUser =
      currentUserId !== undefined &&
      row.original.user_id === currentUserId;
    const rank = row.original.rank;

    const rowClass = isCurrentUser
      ? "bg-[#8065CD]/20 border-t-2 border-b-2 border-[#8065CD] font-semibold"
      : getRowBgClass(rank);

    return (
      <TableRow key={row.id} className={rowClass}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlgoTimeDataTable({
  participants,
  currentUserId,
  loading = false,
  search,
  onSearchChange,
  page,
  totalPages,
  total,
  onPageChange,
}: Props) {
  const columns: ColumnDef<Participant>[] = [
    { id: "rank", header: RankHeader, cell: RankCellRenderer },
    { accessorKey: "name", header: NameHeader, cell: NameCellRenderer },
    { accessorKey: "total_score", header: PointsHeader },
    { accessorKey: "problems_solved", header: ProblemsSolvedHeader },
    { accessorKey: "total_time", header: TotalTimeHeader },
  ];

  const table = useReactTable({
    data: participants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Pagination is fully server-driven; tanstack-table is used only for rendering
    manualPagination: true,
  });

  return (
    <div>
      {/* Search bar — debouncing is acceptable here; the actual fetch is in AlgoTimeCard */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8065CD] focus:border-transparent"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {renderTableBody(loading, table.getRowModel().rows, columns, currentUserId, search)}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls — only rendered when there is more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
            {search && ` — ${total} result${total === 1 ? "" : "s"}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1 || loading}
              className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || loading}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}