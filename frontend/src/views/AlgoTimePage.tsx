import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAlgotimeSessionsPage } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";
import { useNavigate } from "react-router-dom";
import { CardPaginationControls } from "@/components/helpers/CardPaginationControls";
import { PUBLIC_CARD_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { getPageItems } from "@/utils/paginationUtils";
import { formatEventDateTime } from "@/utils/eventDisplay";

export default function AlgoTimePage() {
  const [sessions, setSessions] = useState<AlgoTimeSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAlgotimeSessionsPage({
          page,
          pageSize,
          sort: "asc",
        });
        if (!cancelled) {
          setSessions(data.items);
          setTotal(data.total);
          if (data.items.length === 0 && data.total > 0 && page > 1) {
            setPage(page - 1);
          }
        }
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
  }, [page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, pageCount);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">AlgoTime Sessions</h1>
        <p className="text-muted-foreground">All AlgoTime sessions across series and dates.</p>
      </div>

      {loading && <div className="py-12 text-center text-muted-foreground">Loading sessions...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sessions.map((session) => (
          <Card key={session.id} className="cursor-pointer overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col">
            <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
              <div className="relative z-10 text-center w-full">
                <div className="text-xl md:text-2xl font-bold text-primary/80 wrap-break-word leading-tight">{session.eventName}</div>
                {session.seriesName && <div className="text-sm text-muted-foreground mt-2">{session.seriesName}</div>}
              </div>
            </div>

            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium">Questions: {session.questionCount ?? session.questions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatEventDateTime(session.startTime)} - {formatEventDateTime(session.endTime)}</p>
              </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" className="h-8">Details</Button>
                  <Button size="sm" className="h-8"
                    onClick={() => {
                      nav(`/app/algo/${session.eventName}`, {
                        state: {
                          fromFeed: true,
                          algo_sess: session,
                        },
                      })
                    }}
                  >
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

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

      {total === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No AlgoTime sessions</h3>
          <p className="text-muted-foreground">Create a session from the admin dashboard.</p>
        </div>
      )}
    </div>
  );
}
