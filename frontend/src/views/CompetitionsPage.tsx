import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCompetitions } from "@/api/CompetitionAPI";
import type { Competition } from "@/types/competition/Competition.type";

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

const getStatusClasses = (status: "Active" | "Upcoming" | "Completed") => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Active" | "Upcoming" | "Completed">("All");

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
    return () => {
      cancelled = true;
    };
  }, []);

  const competitionsWithStatus = competitions.map((c) => ({
    comp: c,
    status: getCompetitionStatus(c.startDate),
  }));

  // Sort: Active first, then Upcoming, then Completed
  const sortedCompetitions = competitionsWithStatus.sort((a, b) => {
    const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.comp.startDate).getTime() - new Date(b.comp.startDate).getTime();
  });

  // Filter based on selected filter
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
              className={selectedFilter === filter ? "bg-primary text-white" : ""}
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
            
            return (
              <Card
                key={comp.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow bg-white cursor-pointer flex flex-col ${
                  isActive ? "border-2 border-green-200" : ""
                }`}
              >
                <div className={`aspect-4/3 bg-linear-to-br ${
                  isActive ? "from-green-50 via-primary/5" : "from-primary/10 via-primary/5"
                } to-background flex items-center justify-center relative overflow-hidden p-6`}>
                  <div className="absolute inset-0 bg-grid-primary/5"></div>
                  <div className="absolute top-3 right-3 z-20">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${getStatusClasses(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="relative z-10 text-center w-full">
                    <div className="text-xl md:text-2xl font-bold text-primary/80 break-words leading-tight">
                      {title}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-medium">{comp.competitionLocation || "Online"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCompetitionDate(comp.startDate)}</p>
                  </div>

                  <div className={`flex ${isActive ? "flex-col gap-2" : "items-center justify-between"} pt-2 border-t`}>
                    {isActive ? (
                      <>
                        <Button size="sm" className="h-8 w-full bg-green-600 hover:bg-green-700">
                          Join Now
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8">
                          View details
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="h-8">
                          View details
                        </Button>
                        <Button size="sm" className="h-8 cursor-pointer">
                          {status === "Upcoming" ? "Register" : "View"}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredCompetitions.length === 0 && !loading && (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No {selectedFilter !== "All" ? selectedFilter.toLowerCase() : ""} competitions available</h3>
          <p className="text-muted-foreground">
            {selectedFilter !== "All" ? `Try selecting a different filter.` : `Check back later for upcoming events.`}
          </p>
        </div>
      )}
    </div>
  );
}
