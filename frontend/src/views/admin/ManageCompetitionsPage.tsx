import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Filter } from 'lucide-react';
import {useEffect, useState} from 'react';
import CreateCompetitionDialog from "../../components/manageCompetitions/CreateCompetitionDialog"
import { type Competition} from "../../types/competition/Competition.type"
import {logFrontend} from "@/api/LoggerAPI";
import {getCompetitions} from "@/api/CompetitionAPI";

// Helper function to determine competition status
const getCompetitionStatus = (competitionDate: Date): "Completed" | "Active" | "Upcoming" => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compDate = new Date(competitionDate);
  compDate.setHours(0, 0, 0, 0);

  if (today.getTime() > compDate.getTime()) {
    return "Completed";
  } else if (today.getTime() === compDate.getTime()) {
    return "Active";
  } else {
    return "Upcoming";
  }
};

const ManageCompetitions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [competitions, setCompetition] = useState<Competition[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCompetitions = async () => {
      try {
        const data1 = await getCompetitions();

        if (!cancelled) {
          setCompetition(data1);
        }
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `An error occurred. Failed to load competitions: ${(err as Error).message}`,
          component: 'CreateCompetitionDialog.tsx',
          url: window.location.href,
          stack: (err as Error).stack,
        });
      }
    };

    loadCompetitions();

    return () => { cancelled = true; };
  }, []);

  // Filter competitions based on search and status, then sort by date (latest first)
  const filteredCompetitions = competitions
    .filter((comp) => {
      const matchesSearch = comp.competitionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.competitionLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const status = getCompetitionStatus(comp.date);
      const matchesStatus = !statusFilter || statusFilter === "All competitions" || status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleView = (id: string) => {
    console.log('View competition:', id);
    // Add your navigation logic here
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Manage Competitions</h1>
        <p className="text-muted-foreground">View and manage all your competitions</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 sm:w-auto w-full">
              <Filter className="h-4 w-4" />
              <span>{statusFilter ?? "All competitions"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>
              All competitions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Active")}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Upcoming")}>
              Upcoming
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Completed")}>
              Completed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create New Competition Card - Always First */}
        <Card
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 border-dashed border-primary/50 hover:border-primary"
          onClick={() => setDialogOpen(true)}
        >
          <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center">
            <Plus className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-base text-center text-primary">
              Create New Competition
            </h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Add a new competition
            </p>
          </CardContent>
        </Card>

        {/* Existing Competitions */}
        {filteredCompetitions.map((comp) => {
          const status = getCompetitionStatus(comp.date);

          return (
            <Card
              key={comp.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-primary/5"></div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl font-bold text-primary/80 mb-2">
                    {comp.competitionTitle.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs font-medium text-primary/60 uppercase tracking-wider">
                    Competition
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-base mb-1 line-clamp-1">
                    {comp.competitionTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    📍 {comp.competitionLocation}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {new Date(comp.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      status === "Active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : status === "Upcoming"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={() => handleView(comp.id)}
                  >
                    View →
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Results Message */}
      {filteredCompetitions.length === 0 && competitions.length > 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Empty State - No Competitions at All */}
      {competitions.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first competition
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Competition
          </Button>
        </div>
      )}

      <CreateCompetitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        key={dialogOpen ? 'open' : 'closed'}
      />
    </div>
  );
};

export default ManageCompetitions;