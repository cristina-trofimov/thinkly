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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import EditCompetitionDialog from "../../components/manageCompetitions/EditCompetitionDialog"
import { useEffect, useState } from 'react';
import { useNavigate, useOutlet, useLocation } from 'react-router-dom';
import { type Competition } from "../../types/competition/Competition.type"
import { toast } from 'sonner';
import { logFrontend } from "../../api/LoggerAPI";
import { getCompetitions, deleteCompetition } from "../../api/CompetitionAPI";

const getCompetitionStatus = (
  competitionStart: Date | string
): "Completed" | "Active" | "Upcoming" => {
  const now = new Date();
  const start = new Date(competitionStart);

  if (Number.isNaN(start.getTime())) return "Upcoming";

  // If current time is before the start → Upcoming
  if (now < start) return "Upcoming";

  // If same calendar day and now >= start → Active
  const sameDay =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate();

  if (sameDay) return "Active";

  // Otherwise → Completed
  return "Completed";
};

const formatCompetitionDate = (competitionDate: Date) => {
  const date = new Date(competitionDate);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString();
};

const ManageCompetitions = () => {
  const navigate = useNavigate();
  const outlet = useOutlet();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCompetitions = async () => {
    try {
      const data1 = await getCompetitions();
      setCompetitions(data1);
    } catch (err) {
      logFrontend({
        level: 'ERROR',
        message: `An error occurred. Failed to load competitions: ${(err as Error).message}`,
        component: 'ManageCompetitionsPage.tsx',
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
    }
  };

  const getStatusClasses = (status: "Active" | "Upcoming" | "Completed") => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Upcoming":
        return "bg-blue-100 text-blue-700";
      case "Completed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // 1. Handle Success Toast from Navigation State
  useEffect(() => {
    if (location.state?.success) {
      toast.success("Competition published successfully!");

      // Clear the state so the toast doesn't show up again if the user refreshes
      globalThis.history.replaceState({}, document.title);
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
          setCompetitions(data);
        }
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `Failed to load competitions: ${(err as Error).message}`,
          component: 'ManageCompetitionsPage.tsx',
          url: globalThis.location.href,
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
      const matchesSearch = (comp.competitionTitle?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (comp.competitionLocation?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const status = getCompetitionStatus(comp.startDate);
      const matchesStatus = !statusFilter || statusFilter === "All competitions" || status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aDate = new Date(a.startDate);
      const bDate = new Date(b.startDate);
      const aTime = Number.isNaN(aDate.getTime()) ? 0 : aDate.getTime();
      const bTime = Number.isNaN(bDate.getTime()) ? 0 : bDate.getTime();
      return bTime - aTime;
    });

  const handleCardClick = (id: number) => {
    setSelectedCompetitionId(id);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // Reload competitions after successful edit
    loadCompetitions();
  };

  const handleDeleteClick = (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompetitionToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!competitionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCompetition(competitionToDelete.id);
      toast.success(`Competition "${competitionToDelete.name}" deleted successfully`);

      // Reload competitions
      await loadCompetitions();

      setDeleteDialogOpen(false);
      setCompetitionToDelete(null);
    } catch (err) {
      toast.error("Failed to delete competition. Please try again.");
      logFrontend({
        level: 'ERROR',
        message: `Failed to delete competition: ${(err as Error).message}`,
        component: 'ManageCompetitionsPage.tsx',
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
          <div className="aspect-4/3 bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
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
          const status = getCompetitionStatus(comp.startDate);
          return (
            <Card
              key={comp.id}
              className="overflow-hidden hover:shadow-lg transition-shadow bg-white cursor-pointer"
              onClick={() => handleCardClick(comp.id)}
            >
              <div className="aspect-4/3 bg-linear-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-primary/5"></div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl font-bold text-primary/80 mb-2">{(comp.competitionTitle || 'C').charAt(0).toUpperCase()}</div>
                  <div className="text-xs font-medium text-primary/60 uppercase tracking-wider">Competition</div>
                </div>
              </div>
              <CardContent className="p-4 pb-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base mb-1 line-clamp-1 flex-1">{comp.competitionTitle || 'Untitled Competition'}</h3>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusClasses(status)}`}
                  >
                    {status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{comp.competitionLocation || 'Location TBD'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatCompetitionDate(comp.startDate)}</p>
                </div>
                <div className="flex items-center justify-end pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) =>
                      handleDeleteClick(comp.id, comp.competitionTitle || 'Untitled Competition', e)
                    }
                  >
                    Delete <Trash2 className="h-4 w-4 ml-1" />
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
      {competitions.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first competition
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Competition
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      {selectedCompetitionId && (
        <EditCompetitionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          competitionId={selectedCompetitionId}
          onSuccess={handleEditSuccess}
          key={editDialogOpen ? selectedCompetitionId : 'closed'}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the competition "{competitionToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageCompetitions;


