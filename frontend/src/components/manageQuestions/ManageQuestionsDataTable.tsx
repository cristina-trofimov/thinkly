"use client";

import * as React from "react";
import type {
  ColumnDef,
  SortingState,
  TableMeta,
} from "@tanstack/react-table";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Filter,
  Search,
  Trash2,
  Plus,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Question } from "@/types/questions/QuestionPagination.type";
import { deleteQuestion, deleteQuestions, ShowQuestionOnFrontpageByID } from "@/api/QuestionsAPI";
import UploadQuestionsJSONButton from "./UploadQuestionsJSONButton";
import { parseAxiosErrorMessage } from "@/lib/axiosClient";
import { logFrontend } from "@/api/LoggerAPI";
import ManageQuestionsTableSkeleton from "./ManageQuestionsSkeleton";
import { TablePagination } from "@/components/helpers/Pagination";
import { getPageItems, PAGE_SIZE_OPTIONS } from "@/utils/paginationUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManageQuestionsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  difficultyFilter: "all" | "easy" | "medium" | "hard";
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onDifficultyFilterChange: (value: "all" | "easy" | "medium" | "hard") => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onToggleFrontpage?: (questionId: number, shouldShow: boolean) => void;
  refreshTable?: () => void | Promise<void>;
}

const CONTENT_ENTER_CLASS =
  "translate-y-0 opacity-100 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2";
const CONTENT_TRANSITION_CLASS =
  "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out";

export function ManageQuestionsDataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  search,
  difficultyFilter,
  loading = false,
  onSearchChange,
  onDifficultyFilterChange,
  onPageChange,
  onPageSizeChange,
  onToggleFrontpage,
  refreshTable
}: Readonly<ManageQuestionsDataTableProps<TData, TValue>>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const handleQuestionDelete = async (questionId: number): Promise<void> => {
    try {
      await deleteQuestion(questionId);
      toast.success(`Question ${questionId} deleted successfully!`);
      logFrontend({
        level: "INFO",
        message: `Deleted question with ID ${questionId}.`,
        component: "ManageQuestionsDataTable",
        url: globalThis.location.href,
      })
      await refreshTable?.();
    } catch (error) {
      const message = parseAxiosErrorMessage(error);
      logFrontend({
        level: "ERROR",
        message: `Failed to delete question with ID ${questionId}: ${message}`,
        component: "ManageQuestionsDataTable",
        url: globalThis.location.href,
        stack: error instanceof Error ? error.stack : undefined,
      })
      console.error("Error deleting questions:", error);
      toast.error(`Failed to delete question ${questionId}: ${message}`);
    }
  };

  const handleQuestionFrontpageToggle = async (questionId: number, shouldShow: boolean): Promise<boolean> => {
    try {
      await ShowQuestionOnFrontpageByID(questionId, shouldShow);
      onToggleFrontpage?.(questionId, shouldShow);
      toast.success(
        shouldShow
          ? `Question ${questionId} is now shown on the frontpage.`
          : `Question ${questionId} was removed from the frontpage.`,
      );
      return true;
    } catch (error) {
      const message = parseAxiosErrorMessage(error);
      toast.error(`Failed to update frontpage setting for ${questionId}: ${message}`);
      return false;
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    meta: {
      handleQuestionDelete,
      handleQuestionFrontpageToggle,
    } as TableMeta<TData>
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = React.useMemo(
    () => getPageItems(page, pageCount),
    [page, pageCount],
  );

  const handleDelete = async () => {
    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original as Question);

    void logFrontend({
      level: "INFO",
      message: `Deleting ${selectedRows.length} selected question row(s).`,
      component: "ManageQuestionsDataTable",
      url: globalThis.location.href,
    });

    const questionIds = selectedRows.map((row) => Number(row.question_id));

    try {
      const response = await deleteQuestions(questionIds);

      void logFrontend({
        level: "INFO",
        message: `Delete response received: ${response.deleted_count}/${response.total_requested} deleted.`,
        component: "ManageQuestionsDataTable",
        url: globalThis.location.href,
      });

      if (response?.errors?.length) {
        toast.success(
          `Deleted ${response.deleted_count}/${response.total_requested} questions successfully.`
        );
        void logFrontend({
          level: "INFO",
          message: `Deleted question IDs: ${response.deleted_questions.map((q) => q.question_id).join(", ")}`,
          component: "ManageQuestionsDataTable",
          url: globalThis.location.href,
        });
        console.warn("Partial deletion errors:", response.errors);
        toast.warning(`${response.errors.length} questions could not be deleted.`);
        await refreshTable?.();
      } else {
        toast.success(
          `Successfully deleted ${response.deleted_count} question(s).`
        );
        void logFrontend({
          level: "INFO",
          message: `Deleted question IDs: ${response.deleted_questions.map((q) => q.question_id).join(", ")}`,
          component: "ManageQuestionsDataTable",
          url: globalThis.location.href,
        });
        await refreshTable?.();
      }
    } catch (error: unknown) {
      console.error("Error deleting questions:", error);

      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorMessage =
        axiosError.response?.data?.detail ||
        "Failed to delete selected question(s).";

      toast.error(errorMessage);
    } finally {
      setRowSelection({});
    }
  };

  return (
    <div>
      <div className="flex items-center py-4 gap-3">
        <div className="relative items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            placeholder="Filter question titles..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9 w-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5 cursor-pointer">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {difficultyFilter === "all"
                  ? "All Difficulties"
                  : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onDifficultyFilterChange("all")}
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onDifficultyFilterChange("easy")}
            >
              Easy
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onDifficultyFilterChange("medium")}
            >
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onDifficultyFilterChange("hard")}
            >
              Hard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
              {Object.keys(rowSelection).length > 0 && <Button
                className="cursor-pointer"
                variant="softDestructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the question(s) and remove their linked data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 cursor-pointer"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          <UploadQuestionsJSONButton
            variant="default"
            textWhileUploading={<>Uploading...</>}
            onSuccess={() => {
              void refreshTable?.();
              toast.success("Questions uploaded successfully!");
            }}
            onFailure={(errorMessage) => {
              toast.error(`Questions failed to upload: ${errorMessage}`)
            }}
          >
              <Plus className="h-4 w-4" />
              Upload JSON
        </UploadQuestionsJSONButton>
          </div>
      </div>
      {loading ? (
        <ManageQuestionsTableSkeleton />
      ) : (
        <>
          <div className={`${CONTENT_TRANSITION_CLASS} ${CONTENT_ENTER_CLASS}`}>
            <div className="overflow-hidden rounded-md border">
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
                      >
                        {row.getVisibleCells().map((cell) => {
                          return (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          );
                        })}
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
          </div>
          <div className={`flex flex-row items-center justify-between gap-3 py-4 ${CONTENT_TRANSITION_CLASS} ${CONTENT_ENTER_CLASS}`}>
            <div className="flex items-center gap-4">
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
              {Object.keys(rowSelection).length > 0 && (<div className="text-sm text-muted-foreground">
                  {Object.keys(rowSelection).length} of{" "}
                  {table.getRowModel().rows.length} row(s) selected
                </div>)}
            </div>
            <TablePagination
              page={page}
              pageCount={pageCount}
              pageItems={pageItems}
              onPageChange={onPageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
