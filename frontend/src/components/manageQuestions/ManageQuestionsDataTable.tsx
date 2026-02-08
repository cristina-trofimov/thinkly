"use client";

import * as React from "react";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
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
  SquarePen,
  ChevronLeft,
  ChevronRight,
  Trash2,
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
import type { Question } from "@/types/questions/Question.type";
import { deleteQuestions } from "@/api/QuestionsAPI";
import UploadQuestionsJSONButton from "./uploadQuestionsJSONButton";

interface ManageQuestionsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDeleteQuestions?: (deletedQuestionIds: number[]) => void;
}

export function ManageQuestionsDataTable<TData, TValue>({
  columns,
  data,
  onDeleteQuestions
}: Readonly<ManageQuestionsDataTableProps<TData, TValue>>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [isEditMode, setIsEditMode] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const handleCancel = () => {
    setIsEditMode(false);
    setRowSelection({});
  };

  const handleDelete = async () => {
    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original as Question);

    console.log("Deleting rows: ", selectedRows);

    const questionIds = selectedRows.map((row) => Number(row.id));

    try {
      const response = await deleteQuestions(questionIds);

      console.log("Delete response:", response);

      const deletedIds = response.deleted_questions.map((question) => question.question_id);

      if (response?.errors?.length) {
        toast.success(
          `Deleted ${response.deleted_count}/${response.total_requested} questions successfully.`
        );
        console.log("Deleted questions:", response.deleted_questions);
        console.warn("Partial deletion errors:", response.errors);
        toast.warning(`${response.errors.length} questions could not be deleted.`);
        onDeleteQuestions?.(deletedIds);
      } else {
        toast.success(
          `Successfully deleted ${response.deleted_count} question(s).`
        );
        console.log("Deleted questions:", response.deleted_questions);
        onDeleteQuestions?.(deletedIds);
      }
    } catch (error: unknown) {
      console.error("Error deleting questions:", error);

      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorMessage =
        axiosError.response?.data?.detail ||
        "Failed to delete selected question(s).";

      toast.error(errorMessage);
    } finally {
      setIsEditMode(false);
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
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="pl-9 w-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5 cursor-pointer">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {(table.getColumn("difficulty")?.getFilterValue() as string) ??
                  "All Difficulties"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("difficulty")?.setFilterValue(undefined)
              }
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("difficulty")?.setFilterValue("Easy")
              }
            >
              Easy
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("difficulty")?.setFilterValue("Medium")
              }
            >
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("difficulty")?.setFilterValue("Hard")
              }
            >
              Hard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UploadQuestionsJSONButton />
        {isEditMode ? (
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="cursor-pointer"
                  variant="destructive"
                  disabled={Object.keys(rowSelection).length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
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
            <Button variant="outline" onClick={handleCancel}>
              <span className="hidden md:inline-flex items-center cursor-pointer">
                Cancel
              </span>
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="ml-auto cursor-pointer"
            onClick={() => setIsEditMode(true)}
          >
            <SquarePen className="text-primary" />
            <span className="hidden md:inline-flex">Edit</span>
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.id === "select" && !isEditMode) {
                    return null;
                  }
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
                    if (cell.column.id === "select" && !isEditMode) {
                      return null;
                    }
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1">
          {isEditMode ? (
            <div className="text-sm text-muted-foreground">
              {Object.keys(rowSelection).length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </div>
          ) : null}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            className="cursor-pointer"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 text-primary mr-auto" />
            Previous
          </Button>
          <Button
            className="cursor-pointer"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 text-primary ml-auto" />
          </Button>
        </div>
      </div>
    </div>
  );
}
