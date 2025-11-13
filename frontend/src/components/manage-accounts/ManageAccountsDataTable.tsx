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
import type { Account } from "./ManageAccountsColumns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { deleteAccounts } from "@/api/manageAccounts";

interface ManageAccountsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDeleteUsers?: (deletedUserIds: number[]) => void;
}

export function ManageAccountsDataTable<TData, TValue>({
  columns,
  data,
  onDeleteUsers,
}: ManageAccountsDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
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

    const userIds = selectedRows.map((row) => Number(row.id));

    try {
      const response = await deleteAccounts(userIds);

      console.log("Delete response:", response);

      const deletedIds = response.deleted_users.map((user: any) => user.user_id);

      if (response.errors && response.errors.length && response.deleted_count > 0) {
        toast.success(
          `Deleted ${response.deleted_count}/${response.total_requested} users successfully.`
        );
        console.log("Deleted users:", response.deleted_users);
        console.warn("Partial deletion errors:", response.errors);
        toast.warning(`${response.errors.length} users could not be deleted.`);
        onDeleteUsers?.(deletedIds);
      }
      else {
        toast.success(`Successfully deleted ${response.deleted_count} user(s).`);
        console.log("Deleted users:", response.deleted_users);
        onDeleteUsers?.(deletedIds);
      }
    } catch (error: any) {

      console.error("Error deleting users:", error);

      const errorMessage =
        error.response?.data?.detail || "Failed to delete selected user(s).";

      toast.error(errorMessage);
    } finally {
      setIsEditMode(false);
      setRowSelection({});
    }
  };

  // const handleUpdate = async () => {

  // }

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
          <div className="ml-auto flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="ml-auto">
                  <Plus strokeWidth={2.5} />
                  <span className="hidden md:inline-flex">Create User</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <FieldSet>
                  <FieldLegend className="font-semibold">
                    Create User
                  </FieldLegend>
                  <FieldDescription>
                    Fill out the details to create a new user account.
                  </FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                      <Input
                        id="first_name"
                        autoComplete="off"
                        placeholder="John"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                      <Input
                        id="last_name"
                        autoComplete="off"
                        placeholder="Doe"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        type="email"
                        id="email"
                        autoComplete="off"
                        placeholder="johndoe@example.com"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        type="password"
                        id="password"
                        autoComplete="off"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirm_password">
                        Confirm Password
                      </FieldLabel>
                      <Input
                        type="password"
                        id="confirm_password"
                        autoComplete="off"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="account_type">
                        Account Type
                      </FieldLabel>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="participant">
                            Participant
                          </SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field orientation="horizontal" className="justify-end">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Create</Button>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="ml-auto"
              onClick={() => setIsEditMode(true)}
            >
              <SquarePen className="text-primary" />
              <span className="hidden md:inline-flex">Edit</span>
            </Button>
          </div>
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
              <span className="hidden md:inline-flex items-center">Cancel</span>
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
