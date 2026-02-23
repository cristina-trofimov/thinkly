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
import {
  Filter,
  Search,
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
import type { Account } from "@/types/account/Account.type";
import { toast } from "sonner";
import { deleteAccounts } from "@/api/AccountsAPI";

declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    onUserUpdate?: (updatedUser: Account) => void;
  }
}

interface ManageAccountsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDeleteUsers?: (deletedUserIds: number[]) => void;
  onUserUpdate?: (updatedUser: Account) => void;
}

export function ManageAccountsDataTable<TData, TValue>({
  columns,
  data,
  onDeleteUsers,
  onUserUpdate,
}: Readonly<ManageAccountsDataTableProps<TData, TValue>>) {
  const pageSizeOptions = ["10", "25", "50", "100"];
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const selectedCount = Object.keys(rowSelection).length;

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
    meta: {
      onUserUpdate,
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });
  const currentPage = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const pageItems = React.useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index);
    }

    if (currentPage <= 1) {
      return [0, 1, 2, "ellipsis-right", pageCount - 1] as const;
    }

    if (currentPage >= pageCount - 3) {
      return [0, "ellipsis-left", pageCount - 3, pageCount - 2, pageCount - 1] as const;
    }

    return [
      0,
      "ellipsis-left",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis-right",
      pageCount - 1,
    ] as const;
  }, [currentPage, pageCount]);

  const handleDelete = async () => {
    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original as Account);

    console.log("Deleting rows: ", selectedRows);

    const userIds = selectedRows.map((row) => Number(row.id));

    try {
      const response = await deleteAccounts(userIds);

      console.log("Delete response:", response);

      const deletedIds = response.deleted_users.map((user) => user.user_id);

      if (response?.errors?.length) {
        toast.success(
          `Deleted ${response.deleted_count}/${response.total_requested} users successfully.`
        );
        console.log("Deleted users:", response.deleted_users);
        console.warn("Partial deletion errors:", response.errors);
        toast.warning(`${response.errors.length} users could not be deleted.`);
        onDeleteUsers?.(deletedIds);
      } else {
        toast.success(
          `Successfully deleted ${response.deleted_count} user(s).`
        );
        console.log("Deleted users:", response.deleted_users);
        onDeleteUsers?.(deletedIds);
      }
    } catch (error: unknown) {
      console.error("Error deleting users:", error);

      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorMessage =
        axiosError.response?.data?.detail ||
        "Failed to delete selected user(s).";

      toast.error(errorMessage);
    } finally {
      setRowSelection({});
    }
  };

  const handleCancelSelection = () => {
    setRowSelection({});
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
            <Button variant="outline" className="gap-0.5 cursor-pointer">
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
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue(undefined)
              }
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Participant")
              }
            >
              Participant
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Admin")
              }
            >
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                table.getColumn("accountType")?.setFilterValue("Owner")
              }
            >
              Owner
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {selectedCount > 0 ? (
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                size="icon"
                  className="cursor-pointer text-destructive bg-destructive/10 hover:bg-destructive/20"
                >
                  <Trash2/>
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
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={handleCancelSelection}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="ml-auto" />
        )}
      </div>
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
      <div className="flex flex-row items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCount > 0 ? (
            <div className="text-sm text-muted-foreground">
              {selectedCount} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </div>
          ) : null}
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  table.previousPage();
                }}
                className={
                  table.getCanPreviousPage()
                    ? "cursor-pointer"
                    : "pointer-events-none opacity-50"
                }
              />
            </PaginationItem>
            <PaginationItem className="px-2 text-sm text-muted-foreground lg:hidden">
              Page {currentPage + 1} of {pageCount}
            </PaginationItem>
            {pageItems.map((item, index) => (
              <PaginationItem key={`${item}-${index}`} className="hidden lg:block">
                {typeof item === "number" ? (
                  <PaginationLink
                    href="#"
                    isActive={currentPage === item}
                    onClick={(event) => {
                      event.preventDefault();
                      table.setPageIndex(item);
                    }}
                    className="cursor-pointer"
                  >
                    {item + 1}
                  </PaginationLink>
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  table.nextPage();
                }}
                className={
                  table.getCanNextPage()
                    ? "cursor-pointer"
                    : "pointer-events-none opacity-50"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
