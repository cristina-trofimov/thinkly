import { useState, useEffect } from "react";
import { type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logFrontend } from "@/api/LoggerAPI";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "@/components/manageCompetitions/BuildEmail";
import { type Question } from "@/types/questions/Question.type";
import { type Riddle } from "@/types/riddle/Riddle.type";

// UI Components
import { SelectionCard } from "@/components/createActivity/SelectionCard";
import { GeneralInfoCard } from "@/components/createActivity/GeneralInfoCard";
import { GameplayLogicCard } from "@/components/createActivity/GameplayLogicCard";
import { NotificationsCard } from "@/components/createActivity/NotificationsCard";
import type { CompetitionFormPayload } from "@/types/competition/Competition.type";

interface CompetitionFormProps {
    initialData?: CompetitionFormPayload;
    onSubmit: (payload: CompetitionFormPayload) => Promise<void>;
    onCancel: () => void;
    submitLabel: string;
}

const Required = () => <span className="text-destructive ml-1">*</span>;

const mapIdsToItems = <T extends { id: number }>(ids: number[], source: T[]): T[] => {
    return ids
        .map(id => source.find(item => item.id === id))
        .filter((item): item is T => !!item);
};

export function CompetitionForm({ initialData, onSubmit, onCancel, submitLabel }: CompetitionFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.competitionTitle || initialData?.name || "",
        date: initialData?.date || "",
        startTime: initialData?.startTime || "",
        endTime: initialData?.endTime || "",
        location: initialData?.competitionLocation || initialData?.location || "",
        questionCooldownTime: initialData?.questionCooldownTime?.toString() || "300",
        riddleCooldownTime: initialData?.riddleCooldownTime?.toString() || "60",
    });

    const [emailEnabled, setEmailEnabled] = useState(
        initialData === undefined || initialData === null
            ? true
            : !!initialData.emailNotification
    );
    const [emailToAll, setEmailToAll] = useState(initialData?.emailNotification?.to === "all participants");
    const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
    const [emailData, setEmailData] = useState({
        to: initialData?.emailNotification?.to || "",
        subject: initialData?.emailNotification?.subject || "Upcoming Competition Reminder",
        body: initialData?.emailNotification?.body || "",
        sendAtLocal: initialData?.emailNotification?.sendAtLocal || "",
        sendInOneMinute: initialData?.emailNotification?.sendInOneMinute || false,
    });

    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [riddleSearchQuery, setRiddleSearchQuery] = useState("");

    const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);
    const [orderedRiddles, setOrderedRiddles] = useState<Riddle[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [riddles, setRiddles] = useState<Riddle[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [qData, rData] = await Promise.all([getQuestions(), getRiddles()]);

                setQuestions(qData || []);
                setRiddles(rData || []);

                if (initialData?.selectedQuestions) {
                    setOrderedQuestions(mapIdsToItems(initialData.selectedQuestions, qData));
                }

                if (initialData?.selectedRiddles) {
                    setOrderedRiddles(mapIdsToItems(initialData.selectedRiddles, rData));
                }
            } catch (err) {
                logFrontend({
                    level: 'ERROR',
                    message: `Failed load: ${err}`,
                    component: 'CompetitionForm',
                    url: window.location.href
                });
            }
        };

        loadData();
    }, [initialData]);

    useEffect(() => {
        if (emailManuallyEdited || !emailEnabled) return;
        const autoBody = buildCompetitionEmail(formData);
        if (autoBody) setEmailData((prev) => ({ ...prev, body: autoBody }));
    }, [formData, emailManuallyEdited, emailEnabled]);

    const availableQuestions = questions.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()) && !orderedQuestions.some(oq => oq.id === q.id));
    const availableRiddles = riddles.filter(r => r.question.toLowerCase().includes(riddleSearchQuery.toLowerCase()) && !orderedRiddles.some(or => or.id === r.id));

    const moveItem = <T,>(list: T[], setList: React.Dispatch<React.SetStateAction<T[]>>, index: number, direction: 'up' | 'down') => {
        const newList = [...list];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < newList.length) {
            [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
            setList(newList);
        }
    };

    const handleDragEnd = (result: DropResult, type: 'questions' | 'riddles') => {
        const { source, destination } = result;
        if (!destination) return;

        const isQuestion = type === 'questions';
        const sourceList = source.droppableId.includes('available')
            ? (isQuestion ? availableQuestions : availableRiddles)
            : (isQuestion ? orderedQuestions : orderedRiddles);

        let newList = [...(isQuestion ? orderedQuestions : orderedRiddles)] as (Question | Riddle)[];

        if (source.droppableId.includes('available') && destination.droppableId.includes('ordered')) {
            newList.splice(destination.index, 0, sourceList[source.index]);
        } else if (source.droppableId.includes('ordered') && destination.droppableId.includes('ordered')) {
            const [reorderedItem] = newList.splice(source.index, 1);
            newList.splice(destination.index, 0, reorderedItem);
        } else if (source.droppableId.includes('ordered') && destination.droppableId.includes('available')) {
            newList = newList.filter((_, idx) => idx !== source.index);
        }

        if (isQuestion) {
            setOrderedQuestions(newList as Question[]);
        } else {
            setOrderedRiddles(newList as Riddle[]);
        }
    };

    const validate = () => {
        const newErrors: Record<string, boolean> = {
            name: !formData.name.trim(),
            date: !formData.date,
            startTime: !formData.startTime,
            endTime: !formData.endTime,
            questions: orderedQuestions.length === 0,
            riddles: orderedRiddles.length === 0,
        };

        if (Object.values(newErrors).some(v => v)) {
            setErrors(newErrors);
            return "Please fill in all mandatory fields.";
        }

        const competitionStartDateTime = new Date(`${formData.date}T${formData.startTime}`);
        const competitionEndDateTime = new Date(`${formData.date}T${formData.endTime}`);

        if (competitionStartDateTime.getTime() <= Date.now()) {
            setErrors({ name: false, date: true, startTime: true, endTime: true, questions: false, riddles: false });
            return "Competition must be scheduled for a future date/time.";
        }

        if (competitionEndDateTime.getTime() <= competitionStartDateTime.getTime()) {
            setErrors({ name: false, date: false, startTime: true, endTime: true, questions: false, riddles: false });
            return "Competition end time must be after the start time.";
        }

        if (orderedQuestions.length !== orderedRiddles.length) {
            setErrors({ name: false, date: false, startTime: false, endTime: false, questions: true, riddles: true });
            return `Questions and riddles count mismatch.`;
        }

        return null;
    };

    const handleInternalSubmit = async () => {
        const errorMsg = validate();
        if (errorMsg) return toast.error(errorMsg);

        setIsSubmitting(true);
        const payload: CompetitionFormPayload = {
            name: formData.name.trim(),
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location?.trim() || undefined,
            questionCooldownTime: Number(formData.questionCooldownTime),
            riddleCooldownTime: Number(formData.riddleCooldownTime),
            selectedQuestions: orderedQuestions.map(q => Number(q.id)),
            selectedRiddles: orderedRiddles.map(r => Number(r.id)),
            emailEnabled,
            emailNotification: emailEnabled ? {
                to: emailToAll ? "all participants" : emailData.to.trim(),
                subject: emailData.subject.trim(),
                body: emailData.body.trim(),
                sendInOneMinute: emailData.sendInOneMinute,
                sendAtLocal: emailData.sendAtLocal ? new Date(emailData.sendAtLocal).toISOString() : undefined,
            } : undefined,
        };

        try {
            await onSubmit(payload);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDiffColor = (d: string) => {
        const diff = d.toLowerCase();
        if (diff === "easy") return "bg-green-100 text-green-700";
        if (diff === "medium") return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-primary">
                        {initialData ? "Edit Competition" : "Create New Competition"}
                    </h2>
                    <p className="text-muted-foreground text-sm">Configure logic, timeline, and content.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleInternalSubmit} disabled={isSubmitting} className="min-w-[140px]">
                        {isSubmitting ? "Processing..." : submitLabel}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                <div className="lg:col-span-1 space-y-8">
                    <GeneralInfoCard data={formData} errors={errors} onChange={(u) => setFormData(p => ({ ...p, ...u }))} />
                    <GameplayLogicCard questionCooldown={formData.questionCooldownTime} riddleCooldown={formData.riddleCooldownTime} onChange={(u) => setFormData(p => ({ ...p, ...u }))} />
                    <NotificationsCard
                        emailEnabled={emailEnabled}
                        setEmailEnabled={setEmailEnabled}
                        emailToAll={emailToAll}
                        setEmailToAll={setEmailToAll}
                        emailData={emailData}
                        onEmailDataChange={(u) => setEmailData(p => ({ ...p, ...u }))}
                        onManualEdit={() => setEmailManuallyEdited(true)}
                    />
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <SelectionCard<Question>
                        title={<span>Coding Questions<Required /></span>}
                        description="Drag and drop to select and reorder."
                        searchPlaceholder="Search available problems..."
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        availableItems={availableQuestions}
                        orderedItems={orderedQuestions}
                        onAdd={(q) => setOrderedQuestions([...orderedQuestions, q])}
                        onRemove={(id) => setOrderedQuestions(orderedQuestions.filter(q => q.id !== id))}
                        onMove={(idx, dir) => moveItem(orderedQuestions, setOrderedQuestions, idx, dir)}
                        onDragEnd={(res) => handleDragEnd(res, 'questions')}
                        renderItemTitle={(q) => q.title}
                        renderExtraInfo={(q) => (
                            <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded-full ${getDiffColor(q.difficulty)}`}>
                                {q.difficulty}
                            </span>
                        )}
                        droppableIdPrefix="questions"
                        onClearAll={() => setOrderedQuestions([])}
                        onSelectAll={() => setOrderedQuestions(prev => [...prev, ...availableQuestions])}
                        isInvalid={errors.questions}
                    />

                    <SelectionCard<Riddle>
                        title={<span>Riddles<Required /></span>}
                        description="Drag riddles into the sequence."
                        searchPlaceholder="Search riddles..."
                        searchQuery={riddleSearchQuery}
                        onSearchChange={setRiddleSearchQuery}
                        availableItems={availableRiddles}
                        orderedItems={orderedRiddles}
                        onAdd={(r) => setOrderedRiddles([...orderedRiddles, r])}
                        onRemove={(id) => setOrderedRiddles(orderedRiddles.filter(r => r.id !== id))}
                        onMove={(idx, dir) => moveItem(orderedRiddles, setOrderedRiddles, idx, dir)}
                        onDragEnd={(res) => handleDragEnd(res, 'riddles')}
                        renderItemTitle={(r) => r.question}
                        droppableIdPrefix="riddles"
                        onClearAll={() => setOrderedRiddles([])}
                        onSelectAll={() => setOrderedRiddles(prev => [...prev, ...availableRiddles])}
                        isInvalid={errors.riddles}
                    />
                </div>
            </div>
        </div>
    );
}