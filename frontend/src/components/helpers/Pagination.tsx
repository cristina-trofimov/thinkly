import * as React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { PaginationItemValue } from "@/utils/paginationUtils";

export interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageItems: readonly PaginationItemValue[];
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  pageCount,
  pageItems,
  onPageChange,
}: Readonly<TablePaginationProps>) {
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
