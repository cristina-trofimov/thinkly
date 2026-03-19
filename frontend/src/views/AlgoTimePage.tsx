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

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">AlgoTime Sessions</h1>
        <p className="text-muted-foreground">All AlgoTime sessions across series and dates.</p>
      </div>

      {loading && <div className="py-12 text-center text-muted-foreground">Loading sessions…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...sessions]
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col border ${s.status === "Active" ? "border-green-500" : "border-muted"}`}
            >
              <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-primary wrap-break-word leading-tight">
                    {s.eventName}
                  </h2>
                  {s.seriesName && (
                    <p className="text-sm text-muted-foreground mt-1">{s.seriesName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatSessionDate(s.startTime)}  {formatSessionDate(s.endTime)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => console.log(`Accessing session ${s.id}`)}
                  >
                    Access Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {sessions.length === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No AlgoTime sessions</h3>
          <p className="text-muted-foreground">Create a session from the admin dashboard.</p>
        </div>
      )}
    </div>
  );
}
