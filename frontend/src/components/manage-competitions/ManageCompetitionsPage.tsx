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
import { useState } from 'react';
import CreateCompetitionDialog from "../dashboard/CreateCompetitionDialog"

interface Competition {
  id: string;
  name: string;
  date: string;
  description: string;
  color: string;
  status?: string;
}

const ManageCompetitions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sample data until backend gets integrated
  const competitions: Competition[] = [
    {
      id: '1',
      name: 'Comp #1',
      date: '12/10/25',
      description: 'short one line description of comp...',
      color: 'bg-pink-600',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Comp #2',
      date: '12/10/25',
      description: 'short one line description of comp...',
      color: 'bg-yellow-400',
      status: 'Upcoming'
    }
  ];

  // Filter competitions based on search and status
  const filteredCompetitions = competitions.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || comp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (id: string) => {
    console.log('View competition:', id);
    // Add your navigation logic here
  };

  return (
    <div className="p-6">
      {/* Search and Filter Bar */}
      <div className="flex items-center py-4 gap-3 mb-2">
        <div className="relative items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 w-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-0.5">
              <Filter className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden md:inline-flex items-center">
                {statusFilter ?? "All competitions"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>
              All
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
      <div className="flex gap-6 mt-6 px-6">
        {/* Existing Competitions */}
        {filteredCompetitions.map((comp) => (
          <Card key={comp.id} className="border-border rounded-2xl w-[190px] h-[320px] flex flex-col">
            <div 
              className={`min-h-[146px] min-w-[146px] ${comp.color} mx-auto`}
            />
            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="font-semibold text-sm mb-1 text-center">
                  {comp.name} - {comp.date}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {comp.description}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-[66px] h-[36px] mx-auto text-primary hover:bg-accent"
                onClick={() => handleView(comp.id)}
              >
                View
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Create New Competition Card */}
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-border rounded-2xl w-[190px] h-[235px] flex flex-col"
          onClick={() => setDialogOpen(true)}
        >
          <div className="min-h-[146px] min-w-[146px] bg-muted flex items-center justify-center mx-auto">
            <Plus className="w-30 h-30 text-primary" strokeWidth={1} />
          </div>
          <CardContent className="flex-1 flex flex-col justify-center px-2">
              <h3 className="font-semibold text-sm text-center">
                Create New Competition
              </h3>
          </CardContent>
        </Card>

      {/* No Results matching the filter Message */}
        {filteredCompetitions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No competitions found matching your filters.
        </div>
      )}
      </div>
      <CreateCompetitionDialog 
              open={dialogOpen} 
              onOpenChange={setDialogOpen} 
            />
    </div>
  );
};

export default ManageCompetitions;