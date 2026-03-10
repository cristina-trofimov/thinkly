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
