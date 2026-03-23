import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/helpers/Pagination";
import type { PaginationItemValue } from "@/utils/paginationUtils";

type PageSizeOption = {
  value: number;
  label: string;
};

type CardPaginationControlsProps = {
  page: number;
  pageCount: number;
  pageItems: readonly PaginationItemValue[];
  pageSize: number;
  pageSizeOptions: readonly PageSizeOption[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeLabel?: string;
};

export function CardPaginationControls({
  page,
  pageCount,
  pageItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  pageSizeLabel = "Cards per page",
}: CardPaginationControlsProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 py-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{pageSizeLabel}</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            globalThis.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <SelectTrigger className="w-20 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size.value} value={`${size.value}`}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TablePagination
        page={page}
        pageCount={pageCount}
        pageItems={pageItems}
        onPageChange={onPageChange}
      />
    </div>
  );
}
