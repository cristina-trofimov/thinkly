import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCompetitions } from "@/api/CompetitionAPI";
import { getCompetitionsDetails } from "@/api/LeaderboardsAPI";
import { ScoreboardDataTable } from "@/components/leaderboards/ScoreboardDataTable";
import type { Competition } from "@/types/competition/Competition.type";
import type { Participant } from "@/types/leaderboards/CurrentStandings.type";
import { useNavigate } from "react-router-dom";

const getCompetitionStatus = (
  competitionStart: Date | string
): "Completed" | "Active" | "Upcoming" => {
  const now = new Date();
  const start = new Date(competitionStart);
  if (Number.isNaN(start.getTime())) return "Upcoming";
  if (now < start) return "Upcoming";
  const sameDay =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate();
  if (sameDay) return "Active";
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

const getCardGradient = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "from-green-100/60 via-green-50/40 to-background";
    case "Upcoming":
      return "from-blue-100/60 via-blue-50/40 to-background";
    default:
      return "from-muted/40 via-muted/20 to-background";
  }
};

const getCardBorder = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "border-2 border-green-300";
    case "Upcoming":
      return "border-2 border-blue-200";
    default:
      return "border border-border opacity-70";
  }
};

const getTitleColor = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "text-green-800";
    case "Upcoming":
      return "text-blue-700";
    default:
      return "text-muted-foreground";
  }
};

type ModalState =
  | { type: "leaderboard"; competition: Competition }
  | { type: "details"; competition: Competition }
  | null;

export default function CompetitionsPage() {
  const nav = useNavigate()
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Active" | "Upcoming" | "Completed">("All");
  const [modal, setModal] = useState<ModalState>(null);

  const [leaderboardParticipants, setLeaderboardParticipants] = useState<Participant[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompetitions();
        if (!cancelled) setCompetitions(data);
      } catch (err) {
        console.error("Failed to load competitions", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
        console.error("Failed to load leaderboard", err);
        if (!cancelled) setLeaderboardError("Failed to load leaderboard");
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [modal]);

  const competitionsWithStatus = competitions.map((c) => ({
    comp: c,
    status: getCompetitionStatus(c.startDate),
  }));

  const sortedCompetitions = competitionsWithStatus.sort((a, b) => {
    const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.comp.startDate).getTime() - new Date(b.comp.startDate).getTime();
  });

  const filteredCompetitions = selectedFilter === "All"
    ? sortedCompetitions
    : sortedCompetitions.filter((c) => c.status === selectedFilter);

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
        <div className="py-12 text-center text-muted-foreground">Loading competitions…</div>
      )}

      {/* Filter Tags */}
      {!loading && competitions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Active", "Upcoming", "Completed"].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter as "All" | "Active" | "Upcoming" | "Completed")}
              className={selectedFilter === filter ? "bg-primary text-primary-foreground" : ""}
            >
              {filter}
            </Button>
          ))}
        </div>
      )}

      {/* Competitions Grid */}
      {filteredCompetitions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompetitions.map(({ comp, status }) => {
            const title = comp.competitionTitle || "Untitled Competition";
            const isActive = status === "Active";
            const isCompleted = status === "Completed";

            return (
              <Card
                key={comp.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col ${getCardBorder(status)}`}
              >
                {/* Card header */}
                <div className={`aspect-4/3 bg-linear-to-br ${getCardGradient(status)} flex items-center justify-center relative overflow-hidden p-6`}>
                  <div className="absolute inset-0 bg-grid-primary/5"></div>
                  <div className="absolute top-3 right-3 z-20">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getStatusClasses(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="relative z-10 text-center w-full">
                    <div className={`text-xl md:text-2xl font-bold break-words leading-tight ${getTitleColor(status)}`}>
                      {title}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <CardContent className="p-4 pb-0 flex flex-col gap-2">
                  <div>
                    <p className={`text-sm font-medium ${isCompleted ? "text-muted-foreground" : ""}`}>
                      {comp.competitionLocation || "Online"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCompetitionDate(comp.startDate)}
                    </p>
                  </div>

                  {/* Buttons — always right-aligned */}
                  <div className="flex items-center justify-end pt-2 border-t">
                    {isActive ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground"
                          onClick={() => {
                            nav(`/app/comp/${comp.competitionTitle}`, {
                              state: {
                                fromFeed: true,
                                comp: comp,
                              },
                            });
                          }}
                        >
                          Join Now
                        </Button>
                      </>
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
                      /* Upcoming */
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
      )
      }

      {
        filteredCompetitions.length === 0 && !loading && (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">
              No {selectedFilter !== "All" ? selectedFilter.toLowerCase() : ""} competitions available
            </h3>
            <p className="text-muted-foreground">
              {selectedFilter !== "All" ? "Try selecting a different filter." : "Check back later for upcoming events."}
            </p>
          </div>
        )
      }

      {/* Leaderboard Modal */}
      <Dialog open={modal?.type === "leaderboard"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:!max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {modal?.type === "leaderboard" ? (modal.competition.competitionTitle || "Competition") : ""}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Final standings</p>
          </DialogHeader>

          <div className="mt-2 overflow-x-auto">
            {leaderboardLoading && (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading leaderboard…</div>
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

      {/* Competition Details Modal */}
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClasses(getCompetitionStatus(modal.competition.startDate))}`}>
                  {getCompetitionStatus(modal.competition.startDate)}
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
                {modal.competition.description && (
                  <div className="pt-1">
                    <p className="text-muted-foreground font-medium mb-1">About</p>
                    <p className="leading-relaxed">{modal.competition.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
