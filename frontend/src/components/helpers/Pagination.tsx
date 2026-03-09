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

export type PaginationItemValue = number | "ellipsis-left" | "ellipsis-right";

export const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"] as const;

export function getPageItems(
  currentPage: number,
  pageCount: number
): readonly PaginationItemValue[] {
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