import { Card, CardContent, CardFooter} from "@/components/ui/card";
import { Input} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Trash} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import { useOutlet, useNavigate } from "react-router-dom";
import { getAllAlgotimeSessions, deleteAlgotime} from "@/api/AlgotimeAPI";
import type { AlgoTimeSession } from "@/types/algoTime/AlgoTime.type";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import {EditAlgoTimeSessionDialog} from "@/components/algotime/EditAlgotimeDialog"

export default function ManageAlgotimeSessionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [algotimesSessions, setAlgotimesSessions] = useState<AlgoTimeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "Upcoming" | "Active" | "Completed">("all");

  const {
    trackAdminAlgotimeSessionsViewed,
    trackAdminAlgotimeSearched,
    trackAdminAlgotimeCreateNavigated,
  } = useAnalytics();

  // Track page view once on mount
  useEffect(() => {
    trackAdminAlgotimeSessionsViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadATsessions = async () => {
    setLoading(true);
    try {
      const data = await getAllAlgotimeSessions();
      setAlgotimesSessions(data);
    } catch (err: unknown) {
      logFrontend({
        level: "ERROR",
        message: `Failed to load algotime sessions: ${(err as Error).message}`,
        component: "ManageAlgotimeSessionsPage.tsx",
        url: globalThis.location.href,
      });
      toast.error("Failed to load algotime sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadATsessions();
  }, []);

  const getSessionStatus = (startTime: Date, endTime: Date) => {
    const now = new Date();
    if (now < startTime) return { label: "Upcoming", className: "bg-blue-100 text-blue-700" };
    if (now >= startTime && now <= endTime) return { label: "Active", className: "bg-green-100 text-green-700" };
    return { label: "Completed", className: "bg-gray-100 text-gray-600" };
  };

  const filteredSessions = algotimesSessions.filter((session) => {
    const matchesSearch = session.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    const status = getSessionStatus(session.startTime, session.endTime);
    return status.label === statusFilter;
  });

  if (outlet) return outlet;

  const handleCreateNavigation = () => {
    trackAdminAlgotimeCreateNavigated();
    navigate("algoTimeSessionsManagement");
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      trackAdminAlgotimeSearched(value.trim());
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
          Manage Algotime Sessions
        </h1>
        <p className="text-muted-foreground">
          Create and view all algotime sessions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary " />
          <Input
            placeholder="Search algotime session name"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9 w-full"
          />
        </div>
      

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 sm:w-auto w-full">
            <Filter className="h-4 w-4 text-primary" />
            <span>{statusFilter === "all" ? "All Sessions" : statusFilter}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setStatusFilter("all")}>
            All Sessions
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Card
          className="cursor-pointer overflow-hidden hover:shadow-lg transition-all hover:scale-102 border-2 border-dashed border-primary/40 hover:border-primary group"
          onClick={handleCreateNavigation}
        >
            <div className="aspect-4/3 bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
              <Plus
                className="w-16 h-16 text-primary/60 group-hover:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <CardContent className="p-4 bg-white text-center">
              <h3 className="font-semibold text-base text-primary">
                Create New Algotime Session!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Setup a new event
              </p>
            </CardContent>
        </Card>

        {loading && algotimesSessions.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground animate-pulse">
            Loading algotime sessions...
          </div>
        )}

        {filteredSessions.map((ATsession) => (
          <Card
            key={ATsession.id}
            className="overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col h-full"
          >
            <div className="aspect-4/3 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden p-6">
              <div className="absolute top-3 right-3 z-20">
                {(() => {
                  const status = getSessionStatus(ATsession.startTime, ATsession.endTime);
                  return (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${status.className}`}>
                      {status.label}
                    </span>
                  );
                })()}
              </div>
              <div className="relative z-10 text-center w-full">
                <div className="text-2xl md:text-3xl font-bold text-primary/80 break-words leading-tight">
                  {ATsession.eventName || "no event"}
                </div>
              </div>
            </div>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="px-4 py-1.0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Date
                </h4>
                <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                  {ATsession.startTime.toLocaleDateString()}
                </p>
              </div>
            </CardContent>
              <CardFooter>
              <div className="flex justify-end gap-2 pt-3 border-t w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSessionId(ATsession.id);
                    setEditDialogOpen(true);
                  }}
                >
                  View 
                  <Eye className="h-4 w-4 " />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash className="h-4 w-4 " />
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete "{ATsession.eventName}"?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete
                        this algotime session.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>

                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await deleteAlgotime(ATsession.id);
                            toast.success("Session deleted successfully");
                            loadATsessions();
                          } catch {
                            toast.error("Failed to delete session");
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              </CardFooter>
          </Card>
        ))}
      </div>
      {selectedSessionId && (
        <EditAlgoTimeSessionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          sessionId={selectedSessionId}
          onSuccess={loadATsessions}
          key={editDialogOpen ? selectedSessionId : "closed"}
        />
      )}
    </div>
  );
}