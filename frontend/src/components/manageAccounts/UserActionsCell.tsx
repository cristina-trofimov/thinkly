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
import { updateAccount } from "@/api/manageAccounts";
import type { Account } from "@/types/Account";

interface ActionsCellProps {
  user: Account;
  onUserUpdate?: (updatedUser: Account) => void;
}

export function ActionsCell({ user, onUserUpdate } : Readonly<ActionsCellProps>) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
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

  const handleSaveChanges = async () => {
    const updatedFields: Record<string, string> = {};

    if (firstName !== user.firstName) {
      updatedFields["first_name"] = firstName;
    }
    if (lastName !== user.lastName) {
      updatedFields["last_name"] = lastName;
    }
    if (email !== user.email) {
      updatedFields["email"] = email;
    }
    if (accountType.toLowerCase() !== user.accountType.toLowerCase()) {
      updatedFields["type"] = accountType;
    }

    if (Object.keys(updatedFields).length === 0) {
      console.log("No changes made. Skipping update.");
      setIsDialogOpen(false);
      return;
    }

    console.log("Attempting to update user: ", user);

    try {
      const response = await updateAccount(user.id, updatedFields);

      console.log("Update response:", response);
      toast.success("User updated successfully!");

      if (onUserUpdate && response) {
        onUserUpdate(response);
      }
    } catch (error: unknown) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user.");
      handleCancel();
    } finally {
      setIsDialogOpen(false);
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
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(user.id.toString())
            }
          >
            Copy user ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            Edit User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal" className="justify-end">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" onClick={handleSaveChanges}>
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