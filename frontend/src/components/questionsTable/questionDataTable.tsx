import * as React from "react";
import { Filter } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { ColumnDef } from "@tanstack/react-table";

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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DifficultyFilter = "all" | "easy" | "medium" | "hard";
type PaginationItemValue = number | "ellipsis-left" | "ellipsis-right";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"] as const;
const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyFilter;
  label: string;
  testId?: string;
}> = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy", testId: "filter-easy" },
  { value: "medium", label: "Medium", testId: "filter-medium" },
  { value: "hard", label: "Hard", testId: "filter-hard" },
];

function getDifficultyFilterLabel(difficultyFilter: DifficultyFilter) {
  return difficultyFilter === "all"
    ? "Filter Difficulties"
    : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1);
}

function getPageItems(currentPage: number, pageCount: number): readonly PaginationItemValue[] {
  if (pageCount <= 3) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis-right", pageCount] as const;
  }

  if (currentPage >= pageCount - 1) {
    return [1, "ellipsis-left", pageCount - 2, pageCount - 1, pageCount] as const;
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    pageCount,
  ] as const;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  difficultyFilter: DifficultyFilter;
  onSearchChange: (value: string) => void;
  onDifficultyFilterChange: (value: DifficultyFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

interface QuestionTablePaginationProps {
  page: number;
  pageCount: number;
  pageItems: readonly PaginationItemValue[];
  onPageChange: (page: number) => void;
}

function QuestionTablePagination({
  page,
  pageCount,
  pageItems,
  onPageChange,
}: Readonly<QuestionTablePaginationProps>) {
  const createPageClickHandler =
    (targetPage: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onPageChange(targetPage);
    };

  return (
    <Pagination className="mx-0 w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={createPageClickHandler(Math.max(1, page - 1))}
            className={
              page > 1 ? "cursor-pointer" : "pointer-events-none opacity-50"
            }
          />
        </PaginationItem>
        <PaginationItem className="px-2 text-sm text-muted-foreground lg:hidden">
          Page {page} of {pageCount}
        </PaginationItem>
        {pageItems.map((item, index) => (
          <PaginationItem key={`${item}-${index}`} className="hidden lg:block">
            {typeof item === "number" ? (
              <PaginationLink
                href="#"
                isActive={page === item}
                onClick={createPageClickHandler(item)}
                className="cursor-pointer"
              >
                {item}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={createPageClickHandler(Math.min(pageCount, page + 1))}
            className={
              page < pageCount ? "cursor-pointer" : "pointer-events-none opacity-50"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function DataTable<TData extends Question, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  search,
  difficultyFilter,
  onSearchChange,
  onDifficultyFilterChange,
  onPageChange,
  onPageSizeChange,
}: Readonly<DataTableProps<TData, TValue>>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = page;
  const pageItems = React.useMemo(
    () => getPageItems(currentPage, pageCount),
    [currentPage, pageCount],
  );

  const nav = useNavigate();
  const {
    trackQuestionClicked,
    trackQuestionSearched,
    trackQuestionFilteredByDifficulty,
  } = useAnalytics();

  // Debounce search tracking so we don't fire on every keystroke
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        trackQuestionSearched(value.trim());
      }, 600);
    }
  };

  const handleDifficultyFilter = (difficulty: DifficultyFilter) => {
    onDifficultyFilterChange(difficulty);
    trackQuestionFilteredByDifficulty(difficulty);
  };

  const handleQuestionClick = (question: TData) => {
    trackQuestionClicked(
      question.question_name,
      question.difficulty,
      question.question_id
    );
    nav(`/app/code/${question.question_name}`, {
      state: {
        fromFeed: true,
        problem: question,
      },
    });
  };

  return (
    <div>
      <div className="flex items-center mb-3 gap-3">
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="max-w-sm w-[250px]"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {getDifficultyFilterLabel(difficultyFilter)}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DIFFICULTY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                data-testid={option.testId}
                onClick={() => handleDifficultyFilter(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
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
                onClick={() => handleQuestionClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-left cursor-pointer">
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
      <div className="flex flex-row items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Rows per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <QuestionTablePagination
          page={currentPage}
          pageCount={pageCount}
          pageItems={pageItems}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
