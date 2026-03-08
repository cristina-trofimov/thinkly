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
import { Input } from "../ui/input";
import { Button } from "../ui/button";

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
    <Hash className="w-4 h-4 text-muted-foreground" />
    Rank
  </div>
);

const NameHeader = () => (
  <div className="flex items-center gap-1">
    <User className="w-4 h-4 text-muted-foreground" />
    Name
  </div>
);

const PointsHeader = () => (
  <div className="flex items-center gap-1">
    <Star className="w-4 h-4 text-muted-foreground" />
    Total Points
  </div>
);

const ProblemsSolvedHeader = () => (
  <div className="flex items-center gap-1">
    <ListChecks className="w-4 h-4 text-muted-foreground" />
    Problems Solved
  </div>
);

const TotalTimeHeader = () => (
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4 text-muted-foreground" />
    Total Time
  </div>
);

// ─── Cell renderers ───────────────────────────────────────────────────────────

const getRowBgClass = (rank: number) => {
  if (rank === 1) return "bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/40";
  if (rank === 2) return "bg-muted hover:bg-muted/70";
  if (rank === 3) return "bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/40";
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
        <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
          Loading...
        </TableCell>
      </TableRow>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
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
      ? "bg-primary/20 border-t-2 border-b-2 border-primary font-semibold"
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2"
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
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {search && ` — ${total} result${total === 1 ? "" : "s"}`}
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onPageChange(1)}
              disabled={page === 1 || loading}
              variant="outline"
              className="hover:text-primary"
            >
              First
            </Button>
            <Button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || loading}
              variant="outline"
              className="hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              variant="outline"
              className="hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages || loading}
              variant="outline"
              className="hover:text-primary"
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}