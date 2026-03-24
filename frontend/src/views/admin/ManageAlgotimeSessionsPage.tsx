import { Card, CardContent, CardFooter} from "@/components/ui/card";
import { Input} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Trash, Filter} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import { useNavigate } from "react-router-dom";
import { getAlgotimeSessionsPage, deleteAlgotime} from "@/api/AlgotimeAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {EditAlgoTimeSessionDialog} from "@/components/algotime/EditAlgotimeDialog"
import { resetAlgoTimeLeaderboard } from "@/api/LeaderboardsAPI";
import { CardPaginationControls } from "@/components/helpers/CardPaginationControls";
import { ADMIN_CARD_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { getPageItems } from "@/utils/paginationUtils";
import ManageAlgotimeSessionsSkeleton from "@/components/algotime/ManageAlgotimeSessionsSkeleton";
import { useCardReveal } from "@/hooks/useCardReveal";
import {
  formatEventDate,
  getAdminStatusBadgeClasses,
  getEventStatus,
} from "@/utils/eventDisplay";

export default function ManageAlgotimeSessionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [algotimesSessions, setAlgotimesSessions] = useState<AlgoTimeSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "Upcoming" | "Active" | "Completed">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(27);
  const pendingScrollRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const latestRequestId = useRef(0);

  const {
    trackAdminAlgotimeSessionsViewed,
    trackAdminAlgotimeSearched,
    trackAdminAlgotimeCreateNavigated,
  } = useAnalytics();

  // Track page view once on mount
  useEffect(() => {
    trackAdminAlgotimeSessionsViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadATsessions = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    try {
      const data = await getAlgotimeSessionsPage({
        page,
        pageSize,
        search: searchQuery,
        status: statusFilter === "all" ? undefined : statusFilter.toLowerCase() as "active" | "upcoming" | "completed",
      });
      if (requestId !== latestRequestId.current) {
        return;
      }
      setAlgotimesSessions(data.items);
      setTotal(data.total);
      if (data.items.length === 0 && data.total > 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err: unknown) {
      if (requestId !== latestRequestId.current) {
        return;
      }
      logFrontend({
        level: "ERROR",
        message: `Failed to load algotime sessions: ${(err as Error).message}`,
        component: "ManageAlgotimeSessionsPage.tsx",
        url: globalThis.location.href,
      });
      toast.error("Failed to load algotime sessions");
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    loadATsessions();
  }, [loadATsessions]);

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

  const cardsVisible = useCardReveal(loading, algotimesSessions.length);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, pageCount);

  const handleCreateNavigation = () => {
    trackAdminAlgotimeCreateNavigated();
    navigate("/app/dashboard/algoTimeSessions/algoTimeSessionsManagement");
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearchQuery(value);
    if (value.trim()) {
      trackAdminAlgotimeSearched(value.trim());
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
          Manage Algotime Sessions
        </h1>
        <p className="text-muted-foreground">
          Create and view all algotime sessions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary " />
          <Input
            placeholder="Search algotime session name"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9 w-full"
          />
        </div>
      

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 sm:w-auto w-full">
            <Filter className="h-4 w-4 text-primary" />
            <span>{statusFilter === "all" ? "All Sessions" : statusFilter}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}>
            All Sessions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setStatusFilter("Active");
            setPage(1);
          }}>
            Active
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setStatusFilter("Upcoming");
            setPage(1);
          }}>
            Upcoming
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setStatusFilter("Completed");
            setPage(1);
          }}>
            Completed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

        <div className="sm:ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button  className="gap-2 bg-destructive text-white font-bold hover:bg-destructive/40 sm:w-auto w-full">
                <Trash className="h-4 w-4" />
                Reset Leaderboard
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset AlgoTime Leaderboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will PERMANENTLY delete all leaderboard entries. This is
                  typically done at the end of a semester and CANNOT be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      const result = await resetAlgoTimeLeaderboard();
                      toast.success(
                        `Leaderboard reset successfully - ${result.entriesDeleted} ${result.entriesDeleted === 1 ? "entry" : "entries"} deleted.`
                      );
                    } catch {
                      toast.error("Failed to reset the leaderboard.");
                    }
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {loading ? (
        <ManageAlgotimeSessionsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  Create a New Algotime Session!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Setup a new event
                </p>
              </CardContent>
          </Card>

          {algotimesSessions.map((ATsession, index) => (
            (() => {
              const rowIndex = Math.floor(index / 4);
              const enterClass = cardsVisible
                ? "translate-y-0"
                : "translate-y-2 opacity-0";

              return (
            <Card
              key={ATsession.id}
              className={`overflow-hidden hover:shadow-lg transition-all bg-card flex flex-col h-full opacity-100 ${enterClass} motion-safe:duration-700 motion-safe:ease-out`}
              style={{
                transitionDelay: cardsVisible ? `${rowIndex * 50}ms` : "0ms",
              }}
            >
              <div className="aspect-4/3 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                  <div className="absolute top-3 right-3 z-20">
                    {(() => {
                      const status = getEventStatus(ATsession.startTime, ATsession.endTime);
                      return (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getAdminStatusBadgeClasses(status)}`}>
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                <div className="relative z-10 text-center w-full">
                  <div className="text-2xl md:text-3xl font-bold text-primary/80 break-words leading-tight">
                    {ATsession.eventName || "no event"}
                  </div>
                </div>
              </div>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="px-4 py-1.0">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Date
                  </h4>
                  <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                    {formatEventDate(ATsession.startTime)}
                  </p>
                </div>
              </CardContent>
                <CardFooter>
                <div className="flex justify-end gap-2 pt-3 border-t w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionId(ATsession.id);
                      setEditDialogOpen(true);
                    }}
                  >
                    View 
                    <Eye className="h-4 w-4 " />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash className="h-4 w-4 " />
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete "{ATsession.eventName}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete
                          this algotime session.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>

                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={async () => {
                             try {
                              pendingScrollRef.current = true;
                              setLoading(true);
                              await deleteAlgotime(ATsession.id);
                              toast.success("Session deleted successfully");
                              await loadATsessions();
                            } catch {
                              pendingScrollRef.current = false;
                              setLoading(false);
                              toast.error("Failed to delete session");
                            }
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                </CardFooter>
            </Card>
              );
            })()
          ))}
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
      {total === 0 && !loading && (searchQuery.trim() || statusFilter !== "all") && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
      {total === 0 && !loading && !searchQuery.trim() && statusFilter === "all" && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No algotime sessions yet</h3>
          <p className="text-muted-foreground">
            Get started by creating your first algotime session
          </p>
        </div>
      )}
      {selectedSessionId && (
        <EditAlgoTimeSessionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          sessionId={selectedSessionId}
          onSuccess={loadATsessions}
          key={editDialogOpen ? selectedSessionId : "closed"}
        />
      )}
    </div>
  );
}
