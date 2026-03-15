import { Search, Plus, X, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ItemWithId = { id: string | number } | { question_id: string | number };

// Helper function to get the ID regardless of which property is used
function getItemId(item: ItemWithId): string | number {
    if ('id' in item) return item.id;
    return item.question_id;
}

interface SelectionCardProps<T extends ItemWithId> {
    title: React.ReactNode;
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
    onClearAll: () => void;
    onSelectAll: () => void;
    isInvalid?: boolean;
    isReadOnly?: boolean;
}


function AvailableItem<T extends ItemWithId>({
    item, index, onAdd, renderItemTitle, renderExtraInfo, isReadOnly
}: Readonly<{
    item: T;
    index: number;
    onAdd: (item: T) => void;
    renderItemTitle: (item: T) => string;
    renderExtraInfo?: (item: T) => React.ReactNode;
    isReadOnly?: boolean;
}>) {
    return (
        <Draggable draggableId={`avail-${getItemId(item)}`} index={index}>
            {(p, snapshot) => (
                <div ref={p.innerRef} {...p.draggableProps} {...(isReadOnly ? {} : p.dragHandleProps)}
                    className={`group bg-card mb-2 p-3 rounded-lg border shadow-sm flex items-center justify-between hover:border-primary transition-all ${snapshot.isDragging ? "opacity-50" : ""}`}>
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-sm font-semibold truncate">{renderItemTitle(item)}</span>
                        {renderExtraInfo?.(item)}
                    </div>
                    {!isReadOnly && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary shrink-0" onClick={() => onAdd(item)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </Draggable>
    );
}

function OrderedItem<T extends ItemWithId>({
    item,
    index,
    total,
    onMove,
    onRemove,
    renderItemTitle,
    renderExtraInfo,
    isReadOnly
}: Readonly<{
    item: T;
    index: number;
    total: number;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onRemove: (id: string | number) => void;
    renderItemTitle: (item: T) => string;
    renderExtraInfo?: (item: T) => React.ReactNode;
    isReadOnly?: boolean;
}>) {
    return (
        <Draggable draggableId={`ordered-${getItemId(item)}`} index={index}>
            {(p, snapshot) => (
                <div ref={p.innerRef} {...p.draggableProps}
                    className={`bg-card mb-2 p-3 rounded-lg border flex items-center gap-2 ${snapshot.isDragging ? "shadow-lg ring-1 ring-primary" : ""}`}>
                    <div {...(isReadOnly ? {} : p.dragHandleProps)}>
                        <GripVertical className={`h-4 w-4 ${isReadOnly ? "text-slate-200" : "text-slate-300"}`} />
                    </div>
                    <span className="text-sm font-black text-slate-300 w-4">{index + 1}</span>
                    <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
                        <p className="text-sm font-bold truncate">{renderItemTitle(item)}</p>
                        {renderExtraInfo?.(item)}
                    </div>
                    <div className="flex items-center gap-1">
                        {!isReadOnly && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0 || isReadOnly} onClick={() => onMove(index, 'up')}>
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1 || isReadOnly} onClick={() => onMove(index, 'down')}>
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={isReadOnly} onClick={() => onRemove(getItemId(item))}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}

export function SelectionCard<T extends ItemWithId>(props: Readonly<SelectionCardProps<T>>) {
    return (
        <DragDropContext onDragEnd={props.isReadOnly ? () => { } : props.onDragEnd}>
            <Card className={props.isInvalid ? "border-destructive ring-1 ring-destructive" : ""}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <CardTitle className="text-xl">{props.title}</CardTitle>
                            <CardDescription>{props.description}</CardDescription>
                        </div>
                        <div className="text-right border-l pl-4">
                            <span className="text-2xl font-bold text-primary">{props.orderedItems.length}</span>
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Selected</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={props.searchPlaceholder}
                            className="pl-9"
                            value={props.searchQuery}
                            onChange={e => props.onSearchChange(e.target.value)}
                            disabled={props.isReadOnly}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Available Column */}
                        <Droppable droppableId={`${props.droppableIdPrefix}-available`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="border rounded-xl bg-muted/50 p-4 min-h-50 max-h-100 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Available</Label>
                                        {props.availableItems.length > 0 && !props.isReadOnly && (
                                            <Button variant="ghost" size="sm" onClick={props.onSelectAll} className="h-6 px-2 text-[10px] uppercase font-bold text-primary">Select All</Button>
                                        )}
                                    </div>
                                    {props.availableItems.map((item, idx) => (
                                        <AvailableItem
                                            key={getItemId(item)}
                                            item={item}
                                            index={idx}
                                            onAdd={props.onAdd}
                                            renderItemTitle={props.renderItemTitle}
                                            renderExtraInfo={props.renderExtraInfo}
                                            isReadOnly={props.isReadOnly}
                                        />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* Ordered Column */}
                        <Droppable droppableId={`${props.droppableIdPrefix}-ordered`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="border rounded-xl bg-accent/50 border-accent p-4 min-h-50 max-h-100 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-[10px] uppercase text-primary font-bold">Sequence</Label>
                                        {props.orderedItems.length > 0 && !props.isReadOnly && (
                                            <Button variant="ghost" size="sm" onClick={props.onClearAll} className="h-6 px-2 text-[10px] uppercase text-muted-foreground font-bold">Deselect All</Button>
                                        )}
                                    </div>
                                    {props.orderedItems.map((item, idx) => (
                                        <OrderedItem
                                            key={getItemId(item)}
                                            item={item}
                                            index={idx}
                                            total={props.orderedItems.length}
                                            onMove={props.onMove}
                                            onRemove={props.onRemove}
                                            renderItemTitle={props.renderItemTitle}
                                            renderExtraInfo={props.renderExtraInfo}
                                            isReadOnly={props.isReadOnly}
                                        />
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