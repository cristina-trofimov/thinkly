import { Card, CardContent, CardHeader} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, FileText, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from "sonner";

// Import your Create Form and API service
import CreateRiddleForm from "@/components/forms/FileUpload"; // Adjust path if needed
import { getRiddles } from "@/api/RiddlesAPI"; // Adjust path if needed
import type { Riddle } from '@/types/riddle/Riddle.type';

export default function ManageRiddles() {
    const [searchQuery, setSearchQuery] = useState('');
    const [riddles, setRiddles] = useState<Riddle[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const loadRiddles = async () => {
        setLoading(true);
        try {
            const data = await getRiddles();
            setRiddles(data);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load riddles");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRiddles();
    }, []);

    // Callback when a riddle is successfully created
    const handleRiddleCreated = () => {
        setIsCreateOpen(false); // Close modal
        loadRiddles(); // Refresh list
    };

    const filteredRiddles = riddles.filter((r) =>
        r.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Manage Riddles</h1>
                <p className="text-muted-foreground">Create and view all riddles available for competitions.</p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search question or answer..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Create New Riddle Card (Triggers Modal) */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-dashed border-primary/40 hover:border-primary group h-full min-h-[200px]">
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <Plus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                                </div>
                                <h3 className="font-semibold text-lg text-primary">Create New Riddle</h3>
                                <p className="text-sm text-muted-foreground mt-1">Add a brain teaser</p>
                            </div>
                        </Card>
                    </DialogTrigger>

                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Riddle</DialogTitle>
                        </DialogHeader>
                        {/* Pass the callback to refresh list after creation */}
                        <CreateRiddleForm onSuccess={handleRiddleCreated} />
                    </DialogContent>
                </Dialog>

                {/* Loading State */}
                {loading && riddles.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground animate-pulse">
                        Loading riddles...
                    </div>
                )}

                {/* Riddle Cards */}
                {filteredRiddles.map((riddle) => (
                    <Card key={riddle.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col h-full">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-start gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <HelpCircle className="w-5 h-5 text-primary" />
                                </div>
                                {riddle.file && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> Has Media
                                    </span>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 flex-1 flex flex-col gap-4">
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Question</h4>
                                <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                                    {riddle.question}
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Answer</h4>
                                <p className="text-sm text-gray-700 italic">
                                    {riddle.answer}
                                </p>
                            </div>

                            {riddle.file && (
                                <div className="pt-2">
                                    <Button variant="outline" size="sm" className="w-full text-xs gap-2" asChild>
                                        <a href={riddle.file} target="_blank" rel="noopener noreferrer">
                                            <FileText className="w-3 h-3" /> View Attachment
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}