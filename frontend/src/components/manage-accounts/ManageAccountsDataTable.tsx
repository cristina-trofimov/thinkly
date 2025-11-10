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
import type { Account } from "./ManageAccountsColumns";
import { config } from "../../config";
import { toast } from "sonner";

interface ManageAccountsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ManageAccountsDataTable<TData, TValue>({
  columns,
  data,
}: ManageAccountsDataTableProps<TData, TValue>) {
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
      .rows.map((row) => row.original as Account);

    console.log("Deleting rows: ", selectedRows);

    const userIds = selectedRows.map((row) => row.id);

    try {
      const response = await fetch(config.backendUrl + "/users/batch-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_ids: userIds,
        }),
      });

      const data = await response.json();

      console.log("Delete response:", data);
      console.log("Response ok:", response);

      if (response.status >= 400 && response.status < 500) {
        toast.error(
          data?.detail || "Bad request — failed to delete selected user(s)."
        );
        return;
      }

      if (response.status >= 500) {
        toast.error("Server error — could not delete selected user(s).");
        return;
      }

      if (response.status === 200) {
        toast.success(`Successfully deleted ${data.deleted_count} user(s).`);
        console.log("Deleted users:", data.deleted_users);
      } else if (response.status === 207) {
        toast.success(
          `Deleted ${data.deleted_count}/${data.total_requested} user(s) successfully.`
        );
        console.log("Deleted users:", data.deleted_users);

        if (data.errors && data.errors.length > 0) {
          console.warn("Partial deletion errors:", data.errors);
          toast.warning(`${data.errors.length} users could not be deleted.`);
        }
      }

    } catch (error) {
      console.error("Error deleting users:", error);
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
            placeholder="Filter emails..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.target.value)
            }
            className="pl-9 w-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {(table.getColumn("accountType")?.getFilterValue() as string) ??
                  "All Account Types"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Account Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue(undefined)
              }
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Participant")
              }
            >
              Participant
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Admin")
              }
            >
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Owner")
              }
            >
              Owner
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {!isEditMode ? (
          <Button
            variant={"secondary"}
            className="ml-auto"
            onClick={() => setIsEditMode(true)}
          >
            <SquarePen className="h-4 w-4 text-primary" />
            <span className="ml-2 hidden md:inline-flex items-center">
              Edit
            </span>
          </Button>
        ) : (
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
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
                    the account(s) and remove their data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={handleCancel}>
              <span className="ml-2 hidden md:inline-flex items-center">
                Cancel
              </span>
            </Button>
          </div>
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
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 text-primary mr-auto" />
            Previous
          </Button>
          <Button
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
