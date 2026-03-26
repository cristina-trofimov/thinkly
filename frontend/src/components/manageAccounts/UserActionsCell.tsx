"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateAccount } from "@/api/AccountsAPI";
import type { Account } from "@/types/account/Account.type";
import { DialogTitle } from "@radix-ui/react-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

interface ActionsCellProps {
  user: Account;
  onUserUpdate?: (updatedUser: Account) => void;
  currentUserRole?: "Admin" | "Owner" | "Participant";
}

export function ActionsCell({
  user,
  onUserUpdate,
  currentUserRole,
}: Readonly<ActionsCellProps>) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isTransferAlertOpen, setIsTransferAlertOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState(user.firstName);
  const [lastName, setLastName] = React.useState(user.lastName);
  const [email, setEmail] = React.useState(user.email);
  const [accountType, setAccountType] = React.useState(
    user.accountType.toLowerCase()
  );


  React.useEffect(() => {
    if (isDialogOpen) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setAccountType(user.accountType.toLowerCase());
    }
  }, [
    isDialogOpen,
    user.firstName,
    user.lastName,
    user.email,
    user.accountType,
  ]);

  const performUpdate = async () => {
    const updatedFields: Record<string, string> = {};

    if (firstName !== user.firstName) updatedFields["first_name"] = firstName;
    if (lastName !== user.lastName) updatedFields["last_name"] = lastName;
    if (email !== user.email) updatedFields["email"] = email;
    if (accountType.toLowerCase() !== user.accountType.toLowerCase()) {
      updatedFields["user_type"] = accountType;
    }

    try {
      const response = await updateAccount(user.id, updatedFields);
      toast.success("User updated successfully!");
      if (onUserUpdate && response) onUserUpdate(response);
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setIsDialogOpen(false);
      setIsTransferAlertOpen(false);
    }
  };

  const handleSaveClick = () => {
    // Only trigger alert if the target is being changed to Owner and current user is an Owner
    const isPromotingToOwner = accountType.toLowerCase() === "owner" && user.accountType.toLowerCase() !== "owner";

    if (isPromotingToOwner && currentUserRole?.toLowerCase() === "owner") {
      setIsTransferAlertOpen(true);
    } else {
      performUpdate();
    }
  };

  const handleCancel = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setAccountType(user.accountType.toLowerCase());
    setIsDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            Edit User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transfer Ownership Warning Modal */}
      <AlertDialog open={isTransferAlertOpen} onOpenChange={setIsTransferAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
            <AlertDialogDescription >
              This action is irreversible. You are about to promote {user.firstName} {user.lastName} to Owner.
              <br /><br />
              Once confirmed, your account will be downgraded to Admin and you will lose owner-level privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performUpdate} className="bg-destructive hover:bg-destructive/90">
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTitle></DialogTitle>
        <DialogContent>
          <FieldSet>
            <FieldLegend className="font-semibold">Edit User</FieldLegend>
            <FieldDescription>
              Make changes to the user account here.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                <Input
                  id="first_name"
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                <Input
                  id="last_name"
                  autoComplete="off"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  type="email"
                  id="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="account_type">Account Type</FieldLabel>
                <Select
                  defaultValue={accountType}
                  onValueChange={setAccountType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {currentUserRole?.toLowerCase() == "owner" && (
                      <SelectItem value="owner">Owner</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal" className="justify-end">
                <Button variant="outline" type="button" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" onClick={handleSaveClick}>
                  Save Changes
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </DialogContent>
      </Dialog>
    </>
  );
}
