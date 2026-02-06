"use client";

import { useState, useMemo } from "react";
import { Hash, User, Star, ListChecks, Clock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { NumberCircle } from "@/components/ui/NumberCircle";
import {
  type ColumnDef,
  type CellContext,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
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
}

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

export function AlgoTimeDataTable({ participants, currentUserId }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 15;

  // Filter participants based on search query
  // Note: participants are already sorted by rank from the API
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) {
      return participants;
    }
    return participants.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [participants, searchQuery]);

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
    data: filteredParticipants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      pagination: {
        pageIndex: currentPage,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: currentPage, pageSize });
        setCurrentPage(newState.pageIndex);
      }
    },
  });

  const totalPages = table.getPageCount();

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
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
              table.getRowModel().rows.map((row) => {
                const isCurrentUser = currentUserId && row.original.user_id === currentUserId;
                const rank = row.original.rank;

                // Determine row styling based on user and rank
                let rowClass = "";
                if (isCurrentUser) {
                  rowClass = "bg-[#8065CD]/20 border-t-2 border-b-2 border-[#8065CD] font-semibold";
                } else if (currentPage === 0 && !searchQuery) {
                  // Only apply medal colors on first page when not searching
                  rowClass = getRowBgClass(rank);
                }

                return (
                  <TableRow key={row.id} className={rowClass}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-6 text-gray-400"
                >
                  {searchQuery ? "No participants match your search" : "No participants found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
            {searchQuery && ` (${filteredParticipants.length} results)`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
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