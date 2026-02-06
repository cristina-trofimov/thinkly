import { Search, Plus, X, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SelectionCardProps<T> {
    title: string;
    description: string;
    searchPlaceholder: string;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    availableItems: T[];
    orderedItems: T[];
    onAdd: (item: T) => void;
    onRemove: (id: string | number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onDragEnd: (result: DropResult) => void;
    renderItemTitle: (item: T) => string;
    renderExtraInfo?: (item: T) => React.ReactNode;
    droppableIdPrefix: string;
}

export function SelectionCard<T extends { id: string | number }>({
    title,
    description,
    searchPlaceholder,
    searchQuery,
    onSearchChange,
    availableItems,
    orderedItems,
    onAdd,
    onRemove,
    onMove,
    onDragEnd,
    renderItemTitle,
    renderExtraInfo,
    droppableIdPrefix
}: SelectionCardProps<T>) {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary">{orderedItems.length}</span>
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Selected</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            className="pl-9"
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Available Column */}
                        <Droppable droppableId={`${droppableIdPrefix}-available`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="border rounded-xl bg-slate-50/50 p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                                    <Label className="text-[10px] uppercase mb-2 block text-muted-foreground font-bold">Available</Label>
                                    {availableItems.map((item, idx) => (
                                        <Draggable key={`avail-${item.id}`} draggableId={`avail-${item.id}`} index={idx}>
                                            {(p, snapshot) => (
                                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={`group bg-white mb-2 p-3 rounded-lg border shadow-sm flex items-center justify-between hover:border-primary transition-all ${snapshot.isDragging ? "opacity-50" : ""}`}>
                                                    <div className="flex flex-col gap-1 overflow-hidden">
                                                        <span className="text-sm font-semibold truncate">{renderItemTitle(item)}</span>
                                                        {renderExtraInfo?.(item)}
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary shrink-0" onClick={() => onAdd(item)}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* Ordered Column */}
                        <Droppable droppableId={`${droppableIdPrefix}-ordered`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="border rounded-xl bg-primary/5 p-4 border-primary/20 min-h-[200px] max-h-[400px] overflow-y-auto">
                                    <Label className="text-[10px] uppercase mb-2 block text-primary font-bold">Sequence</Label>
                                    {orderedItems.map((item, idx) => (
                                        <Draggable key={`ordered-${item.id}`} draggableId={`ordered-${item.id}`} index={idx}>
                                            {(p, snapshot) => (
                                                <div ref={p.innerRef} {...p.draggableProps} className={`bg-white mb-2 p-3 rounded-lg border flex items-center gap-2 ${snapshot.isDragging ? "shadow-lg ring-1 ring-primary" : ""}`}>
                                                    <div {...p.dragHandleProps}><GripVertical className="h-4 w-4 text-slate-300" /></div>
                                                    <span className="text-sm font-black text-slate-300 w-4">{idx + 1}</span>

                                                    <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
                                                        <p className="text-sm font-bold truncate">{renderItemTitle(item)}</p>
                                                        {/* ADD THIS LINE BELOW TO SHOW DIFFICULTY IN THE ORDERED LIST */}
                                                        {renderExtraInfo?.(item)}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => onMove(idx, 'up')}>
                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === orderedItems.length - 1} onClick={() => onMove(idx, 'down')}>
                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(item.id)}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </CardContent>
            </Card>
        </DragDropContext>
    );
}