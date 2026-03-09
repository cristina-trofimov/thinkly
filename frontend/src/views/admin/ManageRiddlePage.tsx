import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  FileText,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Puzzle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import RiddleForm from "@/components/forms/FileUpload";
import { getRiddlesPage, deleteRiddle } from "@/api/RiddlesAPI";
import type { Riddle } from "@/types/riddle/Riddle.type";
import { useAnalytics } from "@/hooks/useAnalytics";
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

export default function ManageRiddles() {
  const pageSizeOptions = [11, 23, 47, 95] as const;
  const [searchQuery, setSearchQuery] = useState("");
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(23);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRiddle, setEditingRiddle] = useState<Riddle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const {
    trackAdminRiddlesViewed,
    trackAdminRiddleSearched,
    trackAdminRiddleCreateOpened,
    trackAdminRiddleCreateSuccess,
    trackAdminRiddleEditOpened,
    trackAdminRiddleEditSuccess,
    trackAdminRiddleDeleteAttempted,
    trackAdminRiddleDeleteSuccess,
    trackAdminRiddleDeleteFailed,
  } = useAnalytics();

  // Track page view once on mount
  useEffect(() => {
    trackAdminRiddlesViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRiddles = async () => {
    setLoading(true);
    try {
      const result = await getRiddlesPage({
        page,
        pageSize,
        search: searchQuery,
      });
      setRiddles(result.items);
      setTotal(result.total);

      if (result.items.length === 0 && result.total > 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err: unknown) {
      logFrontend({
        level: "ERROR",
        message: `Failed to load riddles: ${err instanceof Error ? err.message : String(err)}`,
        component: "ManageRiddlesPage.tsx",
        url: globalThis.location.href,
      });
      toast.error("Failed to load riddles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiddles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery]);

  const handleRiddleCreated = () => {
    trackAdminRiddleCreateSuccess();
    setIsCreateOpen(false);
    loadRiddles();
  };

  const handleRiddleEdited = () => {
    if (editingRiddle) {
      trackAdminRiddleEditSuccess(editingRiddle.id);
    }
    setIsEditOpen(false);
    setEditingRiddle(null);
    loadRiddles();
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearchQuery(value);
    if (value.trim()) {
      trackAdminRiddleSearched(value.trim());
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    if (page <= 2) {
      return [1, 2, 3, "ellipsis-right", pageCount] as const;
    }

    if (page >= pageCount - 1) {
      return [1, "ellipsis-left", pageCount - 2, pageCount - 1, pageCount] as const;
    }

    return [
      1,
      "ellipsis-left",
      page - 1,
      page,
      page + 1,
      "ellipsis-right",
      pageCount,
    ] as const;
  }, [page, pageCount]);

  function openEdit(r: Riddle) {
    setEditingRiddle(r);
    setIsEditOpen(true);
    trackAdminRiddleEditOpened(r.id);
  }

  function handleDeleteClick(id: number) {
    setDeleteId(id);
    trackAdminRiddleDeleteAttempted(id);
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    setDeleteSubmitting(true);
    try {
      await deleteRiddle(deleteId);
      trackAdminRiddleDeleteSuccess(deleteId);
      toast.success("Riddle deleted!");
      setDeleteId(null);
      await loadRiddles();
    } catch (err: unknown) {
      trackAdminRiddleDeleteFailed(
        deleteId,
        err instanceof Error ? err.message : String(err)
      );
      logFrontend({
        level: "ERROR",
        message: `Failed to delete riddle: ${err instanceof Error ? err.message : String(err)}`,
        component: "ManageRiddlesPage.tsx",
        url: globalThis.location.href,
      });
      toast.error("Failed to delete riddle");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
          Manage Riddles
        </h1>
        <p className="text-muted-foreground">
          Create and view all riddles available for competitions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            placeholder="Search question or answer..."
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9 w-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create New Riddle Card */}
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) trackAdminRiddleCreateOpened();
          }}
        >
          <DialogTrigger asChild>
            <Card className="cursor-pointer overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-dashed border-primary/40 hover:border-primary group h-full min-h-[200px]">
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="font-semibold text-lg text-primary">
                  Create New Riddle
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a brain teaser
                </p>
              </div>
            </Card>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Riddle</DialogTitle>
            </DialogHeader>
            <RiddleForm mode="create" onSuccess={handleRiddleCreated} />
          </DialogContent>
        </Dialog>

        {loading && riddles.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground animate-pulse">
            Loading riddles...
          </div>
        )}

        {riddles.map((riddle) => (
          <Card
            key={riddle.id}
            className="overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col h-full"
          >
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-start gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Puzzle className="w-5 h-5 text-primary" />
                </div>

                <div className="flex items-center gap-2">
                  {riddle.file && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Has Media
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(riddle)}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(riddle.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Question
                </h4>
                <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                  {riddle.question}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Answer
                </h4>
                <p className="text-sm text-gray-700 italic">{riddle.answer}</p>
              </div>

              {riddle.file && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-2"
                    asChild
                  >
                    <a
                      href={riddle.file}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="w-3 h-3" /> View Attachment
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!loading && riddles.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            No results.
          </div>
        )}
      </div>

      <div className="flex flex-row items-center justify-between gap-3 py-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Cards per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPage(1);
              setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-20 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.max(1, page - 1));
                }}
                className={page > 1 ? "cursor-pointer" : "pointer-events-none opacity-50"}
              />
            </PaginationItem>
            {pageItems.map((item, index) => (
              <PaginationItem key={`${item}-${index}`} className="hidden lg:block">
                {typeof item === "number" ? (
                  <PaginationLink
                    href="#"
                    isActive={page === item}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item);
                    }}
                    className="cursor-pointer"
                  >
                    {item}
                  </PaginationLink>
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}
            <PaginationItem className="px-2 text-sm text-muted-foreground lg:hidden">
              Page {page} of {pageCount}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.min(pageCount, page + 1));
                }}
                className={page < pageCount ? "cursor-pointer" : "pointer-events-none opacity-50"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingRiddle(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Riddle</DialogTitle>
          </DialogHeader>
          {editingRiddle && (
            <RiddleForm
              mode="edit"
              initial={{
                id: editingRiddle.id,
                question: editingRiddle.question,
                answer: editingRiddle.answer,
                file: editingRiddle.file ?? null,
              }}
              onSuccess={handleRiddleEdited}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete riddle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the riddle (and its attachment if it
            has one).
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
