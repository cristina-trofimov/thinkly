import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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

  // Sample data - replace with your actual data source
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

      {/* Competitions Grid */}
      <div className="flex gap-6 mt-6 px-6">
        {/* Existing Competitions */}
        {filteredCompetitions.map((comp) => (
          <Card key={comp.id} className="border-[#E5E5E5] rounded-2xl w-[182px] h-[310px] flex flex-col">
            <div className={`h-[146px] w-[146px] ${comp.color} mx-auto mt-4`} />
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="font-bold text-sm mb-1">
                  {comp.name} - {comp.date}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {comp.description}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full text-primary border-primary-200 hover:bg-primary-50"
                onClick={() => handleView(comp.id)}
              >
                View
              </Button>
            </CardContent>
          </Card>
        ))}

      </div>

    </div>
  );
};

export default ManageCompetitions;