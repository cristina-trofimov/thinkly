import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getCompetitionsPage,
} from "@/api/CompetitionAPI";
import { getCompetitionsDetails } from "@/api/LeaderboardsAPI";
import { ScoreboardDataTable } from "@/components/leaderboards/ScoreboardDataTable";
import type { Competition } from "@/types/competition/Competition.type";
import type { Participant } from "@/types/account/Participant.type";
import { useNavigate } from "react-router-dom";
import { logFrontend } from "../api/LoggerAPI";
import { CardPaginationControls } from "@/components/helpers/CardPaginationControls";
import { PUBLIC_CARD_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { getPageItems } from "@/utils/paginationUtils";
import CompetitionsPageSkeleton from "@/components/competitions/CompetitionsPageSkeleton";
import { useCardReveal } from "@/hooks/useCardReveal";
import {
  formatEventDateTime,
  formatEventDateTimeLong,
  getEventStatus,
  getPublicCompetitionCardBorderClasses,
  getPublicCompetitionStatusBadgeClasses,
  getPublicCompetitionTitleClasses,
  type EventStatus as CompetitionStatus,
} from "@/utils/eventDisplay";
import { Filter } from "lucide-react";

type ModalState =
  | { type: "leaderboard"; competition: Competition }
  | { type: "details"; competition: Competition }
  | null;

const getEmptyCompetitionsHeading = (selectedFilter: "All" | CompetitionStatus) => {
  if (selectedFilter === "All") {
    return "No competitions available";
  }

  return `No ${selectedFilter.toLowerCase()} competitions available`;
};

const getEmptyCompetitionsMessage = (selectedFilter: "All" | CompetitionStatus) => {
  if (selectedFilter === "All") {
    return "Check back later for upcoming events.";
  }

  return "Try selecting a different filter.";
};

const renderCompetitionButton = (
  status: CompetitionStatus,
  comp: Competition,
  nav: ReturnType<typeof useNavigate>,
  setModal: (state: ModalState) => void
) => {
  if (status === "Active") {
    return (
      <Button
        size="sm"
        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground"
        onClick={() => {
          nav(`/app/comp/${comp.competitionTitle}`, {
            state: {
              fromFeed: true,
              comp: comp,
            },
          })
        }}
      >
        Join Now
      </Button>
    );
  }

  if (status === "Completed") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs text-muted-foreground hover:bg-muted"
        onClick={() => setModal({ type: "leaderboard", competition: comp })}
      >
        View leaderboard
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-primary-foreground"
      onClick={() => setModal({ type: "details", competition: comp })}
    >
      View details
    </Button>
  );
};

export default function CompetitionsPage() {
  const nav = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"All" | CompetitionStatus>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
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

  type CompetitionWithStatus = { comp: Competition; status: CompetitionStatus };

  const competitionsWithStatus: CompetitionWithStatus[] = competitions.map((c) => ({
    comp: c,
    status: getEventStatus(c.startDate, c.endDate),
  }));
  const cardsVisible = useCardReveal(loading, competitions.length);
  const hasNoMatchingCompetitions = competitionsWithStatus.length === 0 && !loading;
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

      <div className="mb-6 flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5 cursor-pointer">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {selectedFilter === "All" ? "All Competitions" : selectedFilter}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["All", "Active", "Upcoming", "Completed"].map((filter) => (
              <DropdownMenuItem
                key={filter}
                className="cursor-pointer"
                onClick={() => {
                  setPage(1);
                  setSelectedFilter(filter as "All" | CompetitionStatus);
                }}
              >
                {filter === "All" ? "All Competitions" : filter}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <CompetitionsPageSkeleton />
      ) : competitions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {competitionsWithStatus.map(({ comp, status }: CompetitionWithStatus, index) => {
            const title = comp.competitionTitle || "Untitled Competition";
            const rowIndex = Math.floor(index / 4);
            const enterClass = cardsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0";

            return (
              <Card
                key={comp.id}
                className={`overflow-hidden hover:shadow-lg bg-card flex flex-col ${getPublicCompetitionCardBorderClasses(status)} ${enterClass} motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out`}
                style={{
                  transitionDelay: cardsVisible ? `${rowIndex * 50}ms` : "0ms",
                }}
              >
                <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                  <div className="absolute inset-0 bg-grid-primary/5"></div>
                  <div className="absolute top-3 right-3 z-20">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getPublicCompetitionStatusBadgeClasses(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="relative z-10 text-center w-full">
                    <div className={`text-xl md:text-2xl font-bold wrap-break-word leading-tight ${getPublicCompetitionTitleClasses(status)}`}>
                      {title}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 pb-0 flex flex-col gap-2">
                  <div>
                    <p className={`text-sm font-medium ${status === "Completed" ? "text-muted-foreground" : ""}`}>
                      {comp.competitionLocation || "Online"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatEventDateTime(comp.startDate)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t">
                    {renderCompetitionButton(status, comp, nav, setModal)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {total > 0 && (
        <CardPaginationControls
          page={page}
          pageCount={pageCount}
          pageItems={pageItems}
          pageSize={pageSize}
          pageSizeOptions={PUBLIC_CARD_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPage(1);
            setPageSize(value);
          }}
        />
      )}

      {hasNoMatchingCompetitions && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">{getEmptyCompetitionsHeading(selectedFilter)}</h3>
          <p className="text-muted-foreground">{getEmptyCompetitionsMessage(selectedFilter)}</p>
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPublicCompetitionStatusBadgeClasses(getEventStatus(modal.competition.startDate, modal.competition.endDate))}`}>
                  {getEventStatus(modal.competition.startDate, modal.competition.endDate)}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Date & Time</span>
                  <span className="text-right">{formatEventDateTimeLong(modal.competition.startDate)}</span>
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
