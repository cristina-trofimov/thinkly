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
import { useEffect, useState } from 'react';
import { useNavigate, useOutlet, useLocation } from 'react-router-dom'; 
import { type Competition } from "../../types/competition/Competition.type"
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import { getCompetitions } from "../../api/CompetitionAPI";

const getCompetitionStatus = (competitionDate: Date): "Completed" | "Active" | "Upcoming" => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compDate = new Date(competitionDate);
  compDate.setHours(0, 0, 0, 0);

  if (today.getTime() > compDate.getTime()) return "Completed";
  if (today.getTime() === compDate.getTime()) return "Active";
  return "Upcoming";
};

const ManageCompetitions = () => {
  const navigate = useNavigate(); 
  const outlet = useOutlet();
  const location = useLocation(); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [competitions, setCompetition] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Handle Success Toast from Navigation State
  useEffect(() => {
    if (location.state?.success) {
      toast.success("Competition published successfully!");
      
      // Clear the state so the toast doesn't show up again if the user refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 2. Fetch data
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompetitions();
        if (!cancelled) {
          setCompetition(data);
        }
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `Failed to load competitions: ${(err as Error).message}`,
          component: 'ManageCompetitionsPage.tsx',
          url: window.location.href,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [location.key]);

  if (outlet) return outlet;

  const handleCreateNavigation = () => {
    navigate("createCompetition");
  };

  const filteredCompetitions = competitions
    .filter((comp) => {
      const matchesSearch = comp.competitionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.competitionLocation.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getCompetitionStatus(comp.date);
      const matchesStatus = !statusFilter || statusFilter === "All competitions" || status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Manage Competitions</h1>
        <p className="text-muted-foreground">View and manage all your competitions</p>
      </div>

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
            <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>All competitions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Active")}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Upcoming")}>Upcoming</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Completed")}>Completed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create Button Card */}
        <Card
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-102 border-2 border-dashed border-primary/40 hover:border-primary group"
          onClick={handleCreateNavigation}
        >
          <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
            <Plus className="w-16 h-16 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
          </div>
          <CardContent className="p-4 bg-white text-center">
            <h3 className="font-semibold text-base text-primary">Create New Competition</h3>
            <p className="text-sm text-muted-foreground mt-1">Setup a new coding event</p>
          </CardContent>
        </Card>

        {/* Loading Skeleton Placeholder */}
        {loading && competitions.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground animate-pulse">
            Refreshing competition list...
          </div>
        )}

        {/* Competition Cards */}
        {filteredCompetitions.map((comp) => {
          const status = getCompetitionStatus(comp.date);
          return (
            <Card key={comp.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white">
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-primary/5"></div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl font-bold text-primary/80 mb-2">{comp.competitionTitle.charAt(0).toUpperCase()}</div>
                  <div className="text-xs font-medium text-primary/60 uppercase tracking-wider">Competition</div>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-base mb-1 line-clamp-1">{comp.competitionTitle}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">📍 {comp.competitionLocation}</p>
                  <p className="text-xs text-muted-foreground mt-1">📅 {new Date(comp.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    status === "Active" ? "bg-green-100 text-green-700" :
                    status === "Upcoming" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{status}</span>
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">View Details</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ManageCompetitions;