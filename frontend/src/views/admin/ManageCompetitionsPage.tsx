import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Trash2 } from "lucide-react";
import EditCompetitionDialog from "../../components/manageCompetitions/EditCompetitionDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { type Competition } from "../../types/competition/Competition.type";
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import { getCompetitionsPage, deleteCompetition } from "../../api/CompetitionAPI";
import { useAnalytics } from "@/hooks/useAnalytics";
import { CardPaginationControls } from "@/components/helpers/CardPaginationControls";
import { ADMIN_CARD_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { getPageItems } from "@/utils/paginationUtils";
import ManageCompetitionsSkeleton from "@/components/manageCompetitions/ManageCompetitionsSkeleton";
import { useCardReveal } from "@/hooks/useCardReveal";
import {
  formatEventDate,
  getAdminStatusBadgeClasses,
  getEventStatus,
} from "@/utils/eventDisplay";

const ManageCompetitions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(27);
  const [refreshKey, setRefreshKey] = useState(0);
  const pendingScrollRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const latestRequestId = useRef(0);

  const {
    trackAdminCompetitionsViewed,
    trackAdminCompetitionSearched,
    trackAdminCompetitionFilterChanged,
    trackAdminCompetitionCreateNavigated,
    trackAdminCompetitionEditOpened,
    trackAdminCompetitionDeleteAttempted,
    trackAdminCompetitionDeleteSuccess,
    trackAdminCompetitionDeleteFailed,
  } = useAnalytics();

  // Track page view once on mount
  useEffect(() => {
    trackAdminCompetitionsViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompetitions = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    try {
      const data = await getCompetitionsPage({
        page,
        pageSize,
        search: searchQuery,
        status: statusFilter?.toLowerCase() as "active" | "upcoming" | "completed" | undefined,
      });
      if (requestId !== latestRequestId.current) {
        return;
      }
      setCompetitions(data.items);
      setTotal(data.total);
      if (data.items.length === 0 && data.total > 0 && page > 1) {
        setPage(page - 1);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    if (location.state?.success) {
      toast.success("Competition published successfully!");
      globalThis.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadCompetitions();
      } catch (err) {
        logFrontend({
          level: "ERROR",
          message: `Failed to load competitions: ${(err as Error).message}`,
          component: "ManageCompetitionsPage.tsx",
          url: globalThis.location.href,
        });
      }
    };
    load();
  }, [location.key, refreshKey, loadCompetitions]);

  const scrollToTop = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      globalThis.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      scrollFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (!loading || !pendingScrollRef.current) {
      return;
    }

    pendingScrollRef.current = false;
    scrollToTop();
  }, [loading, scrollToTop]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const cardsVisible = useCardReveal(loading, competitions.length);

  const handleCreateNavigation = () => {
    trackAdminCompetitionCreateNavigated();
    navigate("/app/dashboard/competitions/createCompetition");
  };

  // Debounce-free: track on blur or enter would be ideal, but for admin
  // pages simple onChange tracking is acceptable since usage is low-frequency
  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearchQuery(value);
    if (value.trim()) {
      trackAdminCompetitionSearched(value.trim());
    }
  };

  const handleFilterChange = (status: string | undefined) => {
    setPage(1);
    setStatusFilter(status);
    trackAdminCompetitionFilterChanged(status ?? "all");
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, pageCount);

  const handleCardClick = (id: number, title: string) => {
    const comp = competitions.find((c) => c.id === id);
    const status = comp ? getEventStatus(comp.startDate, comp.endDate) : "Upcoming";
    setIsReadOnly(status === "Active" || status === "Completed");
    setSelectedCompetition({ id, title });
    setEditDialogOpen(true);
    trackAdminCompetitionEditOpened(id, title);
  };

  const handleEditSuccess = () => {
    setRefreshKey((current) => current + 1);
  };

  const handleDeleteClick = (
    id: number,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setCompetitionToDelete({ id, name });
    setDeleteDialogOpen(true);
    trackAdminCompetitionDeleteAttempted(id, name);
  };

  const handleDeleteConfirm = async () => {
    if (!competitionToDelete) return;
    const competition = competitionToDelete;
    setIsDeleting(true);
    setDeleteDialogOpen(false);
    try {
      pendingScrollRef.current = true;
      setLoading(true);
      await deleteCompetition(competition.id);
      trackAdminCompetitionDeleteSuccess(
        competition.id,
        competition.name
      );
      toast.success(
        `Competition "${competition.name}" deleted successfully`
      );
      await loadCompetitions();
      setCompetitionToDelete(null);
    } catch (err) {
      pendingScrollRef.current = false;
      setLoading(false);
      trackAdminCompetitionDeleteFailed(
        competition.id,
        (err as Error).message
      );
      toast.error("Failed to delete competition. Please try again.");
      logFrontend({
        level: "ERROR",
        message: `Failed to delete competition: ${(err as Error).message}`,
        component: "ManageCompetitionsPage.tsx",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
          Manage Competitions
        </h1>
        <p className="text-muted-foreground">
          View and manage all your competitions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 sm:w-auto w-full">
              <Filter className="h-4 w-4 text-primary" />
              <span>{statusFilter ?? "All competitions"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleFilterChange(undefined)}>
              All competitions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("Active")}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("Upcoming")}>
              Upcoming
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("Completed")}>
              Completed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <ManageCompetitionsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create Button Card */}
          <Card
            className="cursor-pointer overflow-hidden hover:shadow-lg transition-all hover:scale-102 border-2 border-dashed border-primary/40 hover:border-primary group"
            onClick={handleCreateNavigation}
          >
            <div className="aspect-4/3 bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
              <Plus
                className="w-16 h-16 text-primary/60 group-hover:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <CardContent className="p-4 bg-card text-center">
              <h3 className="font-semibold text-base text-primary">
                Create New Competition
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Setup a new coding event
              </p>
            </CardContent>
          </Card>

          {competitions.map((comp, index) => {
            const status = getEventStatus(comp.startDate, comp.endDate);
            const title = comp.competitionTitle || "Untitled Competition";
            let opacityClass = "opacity-100";
            if (status === "Completed") {
              opacityClass = "opacity-75";
            }
            const rowIndex = Math.floor(index / 4);
            const enterClass = cardsVisible
              ? "translate-y-0"
              : "translate-y-2 opacity-0";

            return (
              <Card
                key={comp.id}
                className={`cursor-pointer overflow-hidden bg-card flex flex-col hover:shadow-lg ${opacityClass} ${enterClass} motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out`}
                onClick={() => handleCardClick(comp.id, title)}
                style={{
                  transitionDelay: cardsVisible ? `${rowIndex * 50}ms` : "0ms",
                }}
              >
                <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                  <div className="absolute inset-0 bg-grid-primary/5"></div>
                  <div className="absolute top-3 right-3 z-20">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getAdminStatusBadgeClasses(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="relative z-10 text-center w-full">
                    <div className="text-2xl md:text-3xl font-bold text-primary/80 break-words leading-tight">
                      {title}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comp.competitionLocation || "Location TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                    {formatEventDate(comp.startDate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(comp.id, title, e)}
                    >
                      Delete <Trash2 className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <CardPaginationControls
          page={page}
          pageCount={pageCount}
          pageItems={pageItems}
          pageSize={pageSize}
          pageSizeOptions={ADMIN_CARD_PAGE_SIZE_OPTIONS}
          onPageChange={(nextPage) => {
            pendingScrollRef.current = true;
            setPage(nextPage);
          }}
          onPageSizeChange={(value) => {
            pendingScrollRef.current = true;
            setPage(1);
            setPageSize(value);
          }}
        />
      )}

      {total === 0 && !loading && (searchQuery.trim() || statusFilter) && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {total === 0 && !loading && !searchQuery.trim() && !statusFilter && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first competition
          </p>
          <Button onClick={handleCreateNavigation}>
            <Plus className="w-4 h-4 mr-2" />
            Create Competition
          </Button>
        </div>
      )}

      {selectedCompetition && (
        <EditCompetitionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          competitionId={selectedCompetition.id}
          onSuccess={handleEditSuccess}
          isReadOnly={isReadOnly}
          key={editDialogOpen ? selectedCompetition.id : "closed"}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the competition "
              {competitionToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageCompetitions;
