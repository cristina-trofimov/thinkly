"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

interface SearchAndFilterBarProps {
  readonly search: string;
  readonly setSearch: (v: string) => void;
  readonly sortAsc: boolean;
  readonly setSortAsc: (v: boolean) => void;
}

export function SearchAndFilterBar({
  search,
  setSearch,
  sortAsc,
  setSortAsc,
}: SearchAndFilterBarProps) {
  return (
    <div className="flex items-center ">
      {/* 🔍 Search Input */}
      <div className="flex-1 max-w-md">
        <Input
          placeholder="Search competition..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>


      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-0.5">
            <Filter className="h-4 w-4 text-primary" />
            <span className="ml-2 hidden md:inline-flex items-center">
              {sortAsc ? "Date: Oldest → Newest" : "Date: Newest → Oldest"}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Sort by Date</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setSortAsc(true)}>
            Oldest → Newest
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortAsc(false)}>
            Newest → Oldest
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
