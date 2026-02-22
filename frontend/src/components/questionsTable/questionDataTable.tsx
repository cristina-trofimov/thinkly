import * as React from "react";
import { Filter } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table";

import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { Question } from "@/types/questions/Question.type";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData extends Question, TValue>({
  columns,
  data,
}: Readonly<DataTableProps<TData, TValue>>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  const nav = useNavigate();
  const {
    trackQuestionClicked,
    trackQuestionSearched,
    trackQuestionFilteredByDifficulty,
  } = useAnalytics();

  // Debounce search tracking so we don't fire on every keystroke
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    table.getColumn("title")?.setFilterValue(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        trackQuestionSearched(value.trim());
      }, 600);
    }
  };

  const handleDifficultyFilter = (difficulty: string | undefined) => {
    table.getColumn("difficulty")?.setFilterValue(difficulty);
    trackQuestionFilteredByDifficulty(difficulty);
  };

  return (
    <div>
      <div className="flex items-center mb-3 gap-3">
        <Input
          placeholder="Search questions..."
          value={
            (table.getColumn("title")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) => handleSearchChange(event.target.value)}
          className="max-w-sm w-[250px]"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {(table.getColumn("difficulty")?.getFilterValue() as string) ??
                  "Filter Difficulties"}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDifficultyFilter(undefined)}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="filter-easy"
              onClick={() => handleDifficultyFilter("Easy")}
            >
              Easy
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="filter-medium"
              onClick={() => handleDifficultyFilter("Medium")}
            >
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="filter-hard"
              onClick={() => handleDifficultyFilter("Hard")}
            >
              Hard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => {
                  const question = row.original;
                  trackQuestionClicked(
                    question.title,
                    question.difficulty,
                    question.id
                  );
                  nav(`/app/code/${question.title}`, {
                    state: {
                      fromFeed: true,
                      problem: question,
                    },
                  });
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-left">
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
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}