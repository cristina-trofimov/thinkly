import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllAlgotimeSessions } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";
import { MapPin } from "lucide-react";
import AlgoTimePageSkeleton from "@/components/algotime/AlgoTimePageSkeleton";
import { useCardReveal } from "@/hooks/useCardReveal";

const formatSessionDate = (d: Date) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSessionStatus = (
  startTime: Date | string,
  endTime: Date | string
): "Active" | "Upcoming" | "Completed" => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime())) return "Upcoming";
  if (now < start) return "Upcoming";
  if (!Number.isNaN(end.getTime()) && now > end) return "Completed";
  return "Active";
};

const getStatusClasses = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-primary-100 text-blue-700";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getCardBorder = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "border-2 border-green-500/50";
    case "Upcoming":
      return "border-2 border-primary/50";
    default:
      return "border border-border opacity-70";
  }
};

const getTitleColor = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "text-green-600 dark:text-green-400";
    case "Upcoming":
      return "text-primary dark:text-blue-400";
    default:
      return "text-muted-foreground";
  }
};

const getSessionButtonClassName = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "h-7 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground";
    case "Upcoming":
      return "h-7 text-xs bg-blue-600 hover:bg-blue-700 text-primary-foreground";
    default:
      return "h-7 text-xs";
  }
};

const getSessionButtonLabel = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "Join Now";
    case "Upcoming":
      return "View Details";
    default:
      return "Access Session";
  }
};

export default function AlgoTimePage() {
  const [sessions, setSessions] = useState<AlgoTimeSession[]>([]);
  const [loading, setLoading] = useState(false);

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
          message: `Failed to load AlgoTime sessions: ${err instanceof Error ? err.message : String(err)}`,
          component: "AlgoTimePage",
          url: globalThis.location.href,
          stack: err instanceof Error ? err.stack : undefined,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionsWithStatus = [...sessions]
    .map((s) => ({
      session: s,
      status: getSessionStatus(s.startTime, s.endTime),
    }))
    .sort((a, b) => {
      const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime();
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
          const enterClass = cardsVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0";

          return (
            <Card
              key={s.id}
              role="article"
              className={`overflow-hidden hover:shadow-lg bg-card flex flex-col ${getCardBorder(status)} ${enterClass} motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out`}
              style={{
                transitionDelay: cardsVisible ? `${rowIndex * 50}ms` : "0ms",
              }}
            >
              <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
                <div className="absolute inset-0 bg-grid-primary/5" />
                <div className="absolute top-3 right-3 z-20">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getStatusClasses(status)}`}
                  >
                    {status}
                  </span>
                </div>
                <div className="relative z-10 text-center w-full">
                  <div
                    className={`text-xl md:text-2xl font-bold wrap-break-word leading-tight ${getTitleColor(status)}`}
                  >
                    {s.eventName}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 pb-0 flex flex-col gap-2">
                <div>
                  {s.seriesName && (
                    <p className={`text-sm font-medium ${status === "Completed" ? "text-muted-foreground" : ""}`}>
                      <div className="flex gap-2"><div className="w-4 h-4"><MapPin strokeWidth={"1.5px"} size={18} /></div>{s.location}</div>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatSessionDate(s.startTime)} to {formatSessionDate(s.endTime)}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t">
                  <Button
                    size="sm"
                    className={getSessionButtonClassName(status)}
                    variant={status === "Completed" ? "outline" : "default"}
                    onClick={() => console.log(`Accessing session ${s.id}`)}
                  >
                    {getSessionButtonLabel(status)}
                  </Button>
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

      {sessions.length === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No AlgoTime sessions</h3>
          <p className="text-muted-foreground">Create a session from the admin dashboard.</p>
        </div>
      )}
    </div>
  );
}
