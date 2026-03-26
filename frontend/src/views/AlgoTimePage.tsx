import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllAlgotimeSessions } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";

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
    .map((s) => ({ session: s, status: getSessionStatus(s.startTime, s.endTime) }))
    .sort((a, b) => {
      const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime();
    });

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">AlgoTime Sessions</h1>
        <p className="text-muted-foreground">All AlgoTime sessions across series and dates.</p>
      </div>

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading sessions…</div>
      )}

      {sessionsWithStatus.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sessionsWithStatus.map(({ session: s, status }) => (
            <Card
              key={s.id}
              className={`overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col ${getCardBorder(status)}`}
            >
              {/* Card header banner */}
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

              {/* Card body */}
              <CardContent className="p-4 pb-0 flex flex-col gap-2">
                <div>
                  {s.seriesName && (
                    <p className={`text-sm font-medium ${status === "Completed" ? "text-muted-foreground" : ""}`}>
                      {s.seriesName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatSessionDate(s.startTime)} → {formatSessionDate(s.endTime)}
                  </p>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-end pt-2 border-t">
                  <Button
                    size="sm"
                    className={`h-7 text-xs ${
                      status === "Active"
                        ? "bg-green-600 hover:bg-green-700 text-primary-foreground"
                        : status === "Upcoming"
                        ? "bg-blue-600 hover:bg-blue-700 text-primary-foreground"
                        : ""
                    }`}
                    variant={status === "Completed" ? "outline" : "default"}
                    onClick={() => console.log(`Accessing session ${s.id}`)}
                  >
                    {status === "Active"
                      ? "Join Now"
                      : status === "Upcoming"
                      ? "View Details"
                      : "Access Session"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sessions.length === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No AlgoTime sessions</h3>
          <p className="text-muted-foreground">Create a session from the admin dashboard.</p>
        </div>
      )}
    </div>
  );
}
