import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllAlgotimeSessions } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";
import { MapPin } from "lucide-react";
import AlgoTimePageSkeleton from "@/components/algotime/AlgoTimePageSkeleton";
import { useCardReveal } from "@/hooks/useCardReveal";
import { useNavigate } from "react-router-dom";

// --- Helpers ---

const formatSessionDate = (d: Date | string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSessionDateLong = (d: Date | string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type SessionStatus = "Active" | "Upcoming" | "Completed";

const getSessionStatus = (startTime: Date | string, endTime: Date | string): SessionStatus => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime())) return "Upcoming";
  if (now < start) return "Upcoming";
  if (!isNaN(end.getTime()) && now > end) return "Completed";
  return "Active";
};

const getStatusClasses = (status: SessionStatus) => {
  switch (status) {
    case "Active": return "bg-green-100 text-green-700";
    case "Upcoming": return "bg-blue-100 text-blue-700";
    default: return "bg-muted text-muted-foreground";
  }
};

const getCardBorder = (status: SessionStatus) => {
  switch (status) {
    case "Active": return "border-2 border-green-500/50";
    case "Upcoming": return "border-2 border-primary/50";
    default: return "border border-border opacity-70";
  }
};

const getTitleColor = (status: SessionStatus) => {
  switch (status) {
    case "Active": return "text-green-600 dark:text-green-400";
    case "Upcoming": return "text-primary dark:text-blue-400";
    default: return "text-muted-foreground";
  }
};

/**
 * Extracted Logic for Rendering Buttons based on Status
 */
const renderSessionButton = (
  status: SessionStatus,
  session: AlgoTimeSession,
  nav: ReturnType<typeof useNavigate>,
  setModal: (s: AlgoTimeSession) => void
) => {
  if (status === "Active") {
    return (
      <Button
        size="sm"
        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground"
        onClick={() => nav(`/app/algo/${session.eventName}`, {
          state: {
            fromFeed: true,
            algo_sess: session,
          },
        })}
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
        onClick={() => nav(`/app/algo/${session.eventName}`, {
          state: {
            fromFeed: true,
            algo_sess: session,
          },
        })}
      >
        Access Session
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
      onClick={() => setModal(session)}
    >
      View details
    </Button>
  );
};

// --- Component ---

export default function AlgoTimePage() {
  const nav = useNavigate();
  const [sessions, setSessions] = useState<AlgoTimeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AlgoTimeSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAllAlgotimeSessions();
        if (!cancelled) setSessions(data);
      } catch (err) {
        logFrontend({
          level: "ERROR",
          message: `Failed to load sessions: ${err instanceof Error ? err.message : String(err)}`,
          component: "AlgoTimePage",
          url: globalThis.location.href,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const sessionsWithStatus = [...sessions]
    .map((s) => ({
      session: s,
      status: getSessionStatus(s.startTime, s.endTime),
    }))
    .sort((a, b) => {
      const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      return diff !== 0 ? diff : new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime();
    });

  const cardsVisible = useCardReveal(loading, sessions.length);
  let sessionsContent: ReactNode = null;

  if (loading) {
    sessionsContent = <AlgoTimePageSkeleton />;
  } else if (sessionsWithStatus.length > 0) {
    sessionsContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sessionsWithStatus.map(({ session: s, status }, index) => {
          const rowIndex = Math.floor(index / 4);
          const enterClass = cardsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0";

          return (
            <Card
              key={s.id}
              className={`overflow-hidden hover:shadow-lg bg-card flex flex-col ${getCardBorder(status)} ${enterClass} motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out`}
              style={{ transitionDelay: cardsVisible ? `${rowIndex * 50}ms` : "0ms" }}
            >
              <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                <div className="absolute inset-0 bg-grid-primary/5" />
                <div className="absolute top-3 right-3 z-20">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shadow-sm ${getStatusClasses(status)}`}>
                    {status}
                  </span>
                </div>
                <div className="relative z-10 text-center w-full">
                  <div className={`text-xl md:text-2xl font-bold wrap-break-word leading-tight ${getTitleColor(status)}`}>
                    {s.eventName}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 pb-0 flex flex-col gap-2">
                <div>
                  <div className={`text-sm font-medium flex gap-2 items-center ${status === "Completed" ? "text-muted-foreground" : ""}`}>
                    <MapPin strokeWidth={1.5} size={16} />
                    {s.location || "Online"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatSessionDate(s.startTime)} - {formatSessionDate(s.endTime)}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t">
                  {renderSessionButton(status, s, nav, setSelectedSession)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">AlgoTime Sessions</h1>
        <p className="text-muted-foreground">All AlgoTime sessions across series and dates.</p>
      </div>

      {sessionsContent}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No sessions available</h3>
          <p className="text-muted-foreground">Try checking back later or contacting an admin.</p>
        </div>
      )}

      {/* Details Modal (Matches CompetitionsPage Details Style) */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSession?.eventName}</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4 pt-2">
              <div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClasses(getSessionStatus(selectedSession.startTime, selectedSession.endTime))}`}>
                  {getSessionStatus(selectedSession.startTime, selectedSession.endTime)}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Start</span>
                  <span className="text-right">{formatSessionDateLong(selectedSession.startTime)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">End</span>
                  <span className="text-right">{formatSessionDateLong(selectedSession.endTime)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Location</span>
                  <span className="text-right">{selectedSession.location || "Online"}</span>
                </div>
                {selectedSession.seriesName && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground font-medium shrink-0">Series</span>
                    <span className="text-right">{selectedSession.seriesName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
