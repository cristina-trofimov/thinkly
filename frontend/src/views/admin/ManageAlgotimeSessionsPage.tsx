import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";
import { useOutlet, useNavigate } from "react-router-dom";
import { getAlgotimeSeries } from "@/api/AlgotimeAPI";
import type { AlgoTimeSeries } from '@/types/algoTime/AlgoTime.type';

export default function ManageAlgotimeSessionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [algotimesSessions, setAlgotimeSessions] = useState<AlgoTimeSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();

  const loadATsessions = async () => {
    setLoading(true);
    try {
      const data = await getAlgotimeSeries();
      setAlgotimeSessions(data);
    } catch (err: unknown) {
      logFrontend({
        level: 'ERROR',
        message: `Failed to load algotime sessions: ${(err as Error).message}`,
        component: 'ManageAlgotimeSessionsPage.tsx',
        url: window.location.href,
      });
      toast.error("Failed to load algotime sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadATsessions();
  }, []);


  const filteredSessions = algotimesSessions.filter((q) =>
    q.seriesName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (outlet) return outlet;

  const handleCreateNavigation = () => {
    navigate("algoTimeSessionsManagement");
  };
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Manage Algotime Sessions</h1>
        <p className="text-muted-foreground">Create and view all algotime sessions.</p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search algotime session name"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        <Card
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-102 border-2 border-dashed border-primary/40 hover:border-primary group"
          onClick={handleCreateNavigation}
        >
          <CardHeader className=" pb-0 flex items-center justify-center">
            <div className="bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
              <Plus className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className=" p-0 bg-white  text-center">
            <div className="px-4 py-1.5">
              <h3 className="font-semibold text-base text-primary">Create a new algotime session</h3>
              <p className="text-sm text-muted-foreground mt-1">Setup a new event!</p>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && algotimesSessions.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground animate-pulse">
            Loading algotime sessions...
          </div>
        )}

        {/*Algotime Cards */}
        {filteredSessions.map((ATsession) => (
          <Card key={ATsession.seriesId} className="overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col h-full">
            <CardHeader className="pb-0">
              <div className="bg-primary/10 rounded-lg h-[72px] flex items-center px-3">
                <p className="font-medium text-sm line-clamp-3 leading-relaxed text-gray-900">
                  {ATsession.seriesName}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="px-4 py-1.0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date</h4>
                <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                  {ATsession.seriesId}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
