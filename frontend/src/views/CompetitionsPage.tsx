import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getCompetitionsPage,
} from "@/api/CompetitionAPI";
import { getCompetitionsDetails } from "@/api/LeaderboardsAPI";
import { ScoreboardDataTable } from "@/components/leaderboards/ScoreboardDataTable";
import type { Competition } from "@/types/competition/Competition.type";
import type { Participant } from "@/types/account/Participant.type";
import { useNavigate } from "react-router-dom";
import { logFrontend } from "../api/LoggerAPI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/helpers/Pagination";
import { getPageItems, PAGE_SIZE_OPTIONS } from "@/utils/paginationUtils";

const getCompetitionStatus = (
  competitionStart: Date | string,
  competitionEnd?: Date | string
): "Completed" | "Active" | "Upcoming" => {
  const now = new Date();
  const start = new Date(competitionStart);
  const end = competitionEnd ? new Date(competitionEnd) : start;
  if (Number.isNaN(start.getTime())) return "Upcoming";
  if (now < start) return "Upcoming";
  if (!Number.isNaN(end.getTime()) && now <= end) return "Active";
  return "Completed";
};

const formatCompetitionDate = (competitionDate: Date) => {
  const date = new Date(competitionDate);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCompetitionDateLong = (competitionDate: Date) => {
  const date = new Date(competitionDate);
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClasses = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getCardBorder = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "border-2 border-green-500/50";
    case "Upcoming":
      return "border-2 border-blue-500/50";
    default:
      return "border border-border opacity-70";
  }
};

const getTitleColor = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "text-green-600 dark:text-green-400";
    case "Upcoming":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-muted-foreground";
  }
};

type ModalState =
  | { type: "leaderboard"; competition: Competition }
  | { type: "details"; competition: Competition }
  | null;

export default function CompetitionsPage() {
  const nav = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Active" | "Upcoming" | "Completed">("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [modal, setModal] = useState<ModalState>(null);

  const [leaderboardParticipants, setLeaderboardParticipants] = useState<Participant[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompetitionsPage({
          page,
          pageSize,
          status: selectedFilter === "All"
            ? undefined
            : selectedFilter.toLowerCase() as "active" | "upcoming" | "completed",
        });
        if (!cancelled) {
          setCompetitions(data.items);
          setTotal(data.total);
          if (data.items.length === 0 && data.total > 0 && page > 1) {
            setPage(page - 1);
          }
        }
      } catch (err) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during competition fetch.";

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch competitions. Reason: ${errorMessage}`,
          component: "CompetitionsPage",
          url: globalThis.location.href,
          stack: isError ? err.stack : undefined,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page, pageSize, selectedFilter]);

  useEffect(() => {
    if (modal?.type !== "leaderboard") {
      setLeaderboardParticipants([]);
      setLeaderboardError(null);
      return;
    }

    let cancelled = false;
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const pageData = await getCompetitionsDetails({
          search: modal.competition.competitionTitle ?? "",
          sort: "desc",
          page: 1,
          pageSize: 1,
        });
        const match = pageData.competitions.find(
          (c) => c.competitionTitle === modal.competition.competitionTitle
        );
        if (!cancelled) setLeaderboardParticipants(match?.participants ?? []);
      } catch (err) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during leaderboard fetch.";

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch leaderboard. Reason: ${errorMessage}`,
          component: "CompetitionsPage",
          url: globalThis.location.href,
          stack: isError ? err.stack : undefined,
        });

        if (!cancelled) setLeaderboardError("Failed to load leaderboard");
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [modal]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, pageCount);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
          Competitions
        </h1>
        <p className="text-muted-foreground">
          Upcoming and past competitions.
        </p>
      </div>

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading competitions...</div>
      )}

      {!loading && total > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Active", "Upcoming", "Completed"].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setSelectedFilter(filter as "All" | "Active" | "Upcoming" | "Completed");
              }}
              className={selectedFilter === filter ? "bg-primary text-primary-foreground" : ""}
            >
              {filter}
            </Button>
          ))}
        </div>
      )}

      {competitions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {competitions.map((comp) => {
            const status = getCompetitionStatus(comp.startDate, comp.endDate);
            const title = comp.competitionTitle || "Untitled Competition";
            const isActive = status === "Active";
            const isCompleted = status === "Completed";

            return (
              <Card
                key={comp.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col ${getCardBorder(status)}`}
              >
                <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                  <div className="absolute inset-0 bg-grid-primary/5"></div>
                  <div className="absolute top-3 right-3 z-20">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getStatusClasses(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="relative z-10 text-center w-full">
                    <div className={`text-xl md:text-2xl font-bold wrap-break-word leading-tight ${getTitleColor(status)}`}>
                      {title}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 pb-0 flex flex-col gap-2">
                  <div>
                    <p className={`text-sm font-medium ${isCompleted ? "text-muted-foreground" : ""}`}>
                      {comp.competitionLocation || "Online"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCompetitionDate(comp.startDate)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t">
                    {isActive ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground"
                        onClick={() => {
                          nav(`/app/comp/${comp.competitionTitle}`, {
                            state: {
                              fromFeed: true,
                              comp,
                            },
                          });
                        }}
                      >
                        Join Now
                      </Button>
                    ) : isCompleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setModal({ type: "leaderboard", competition: comp })}
                      >
                        View leaderboard
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-primary-foreground"
                        onClick={() => setModal({ type: "details", competition: comp })}
                      >
                        View details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 0 && (
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
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            pageItems={pageItems}
            onPageChange={setPage}
          />
        </div>
      )}

      {total === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">
            No {selectedFilter !== "All" ? selectedFilter.toLowerCase() : ""} competitions available
          </h3>
          <p className="text-muted-foreground">
            {selectedFilter !== "All" ? "Try selecting a different filter." : "Check back later for upcoming events."}
          </p>
        </div>
      )}

      <Dialog open={modal?.type === "leaderboard"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-3xl! w-full">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {modal?.type === "leaderboard" ? (modal.competition.competitionTitle || "Competition") : ""}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Final standings</p>
          </DialogHeader>

          <div className="mt-2 overflow-x-auto">
            {leaderboardLoading && (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading leaderboard...</div>
            )}
            {leaderboardError && (
              <div className="py-10 text-center text-destructive text-sm bg-destructive/10 rounded-lg border border-destructive/20">{leaderboardError}</div>
            )}
            {!leaderboardLoading && !leaderboardError && leaderboardParticipants.length === 0 && (
              <div className="py-10 text-center text-muted-foreground text-sm">No results available for this competition.</div>
            )}
            {!leaderboardLoading && !leaderboardError && leaderboardParticipants.length > 0 && (
              <ScoreboardDataTable participants={leaderboardParticipants} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.type === "details"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modal?.type === "details" ? (modal.competition.competitionTitle || "Competition") : ""}
            </DialogTitle>
          </DialogHeader>
          {modal?.type === "details" && (
            <div className="space-y-4 pt-2">
              <div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClasses(getCompetitionStatus(modal.competition.startDate, modal.competition.endDate))}`}>
                  {getCompetitionStatus(modal.competition.startDate, modal.competition.endDate)}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Date & Time</span>
                  <span className="text-right">{formatCompetitionDateLong(modal.competition.startDate)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Location</span>
                  <span>{modal.competition.competitionLocation || "Online"}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
