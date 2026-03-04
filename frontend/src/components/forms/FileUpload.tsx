import { Trash2, UploadCloud, FileText, X } from "lucide-react";
import { useRef, useState, useEffect, type DragEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { logFrontend } from "../../api/LoggerAPI";

// Services
import { createRiddle, updateRiddle } from "@/api/RiddlesAPI";

type Mode = "create" | "edit";

type InitialRiddle = {
    id: number;
    question: string;
    answer: string;
    file: string | null;
};

interface RiddleFormProps {
    mode: Mode;
    onSuccess?: () => void;

    /** Required in edit mode */
    initial?: InitialRiddle;
}

export default function RiddleForm({ mode, onSuccess, initial }: Readonly<RiddleFormProps>) {
    const isEdit = mode === "edit";

    // Form State
    const [question, setQuestion] = useState(initial?.question ?? "");
    const [answer, setAnswer] = useState(initial?.answer ?? "");

    // Existing backend file (edit mode only)
    const [existingFileUrl, setExistingFileUrl] = useState<string | null>(initial?.file ?? null);
    const [removeExistingFile, setRemoveExistingFile] = useState(false);

    // New file selection (create OR edit)
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // UI State
    const [isOver, setIsOver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // If parent changes initial (opening different riddle), sync state
    useEffect(() => {
        setQuestion(initial?.question ?? "");
        setAnswer(initial?.answer ?? "");
        setExistingFileUrl(initial?.file ?? null);
        setRemoveExistingFile(false);
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    // --- File Handling ---
    function validateFile(f: File) {
        const maxMB = 100;
        if (f.size > maxMB * 1024 * 1024) return `File too large. Max ${maxMB}MB.`;

        const ok =
            f.type.startsWith("image/") ||
            f.type.startsWith("audio/") ||
            f.type.startsWith("video/") ||
            f.type === "application/pdf";

        if (!ok) return "Unsupported file type. Use image/audio/video/pdf.";
        return "";
    }

    function handleFileSelect(selectedFile: File) {
        const error = validateFile(selectedFile);
        if (error) {
            logFrontend({
                level: "ERROR",
                message: `Invalid riddle attachment: ${error}`,
                component: "RiddleForm.tsx",
                url: globalThis.location.href,
            });
            toast.error(error);
            return;
        }

        // Selecting a new file means: do NOT remove existing; it will be replaced
        setRemoveExistingFile(false);

        // Replace previous preview URL if any
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        const objectUrl = URL.createObjectURL(selectedFile);
        setFile(selectedFile);
        setPreviewUrl(objectUrl);
    }

    function onPick(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
        e.target.value = "";
    }

    function onDrop(e: DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    }

    function removeSelectedFile() {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    }

    // --- Drag Visuals ---
    function onDragOver(e: DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        setIsOver(true);
    }
    function onDragLeave(e: DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        setIsOver(false);
    }

    // --- Submission Logic ---
    async function handleSubmit() {
        if (!question.trim() || !answer.trim()) {
            toast.error("Question and Answer are required.");
            return;
        }

        if (isEdit && !initial?.id) {
            toast.error("Missing riddle id for edit.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEdit) {
                await updateRiddle({
                    riddleId: initial!.id,
                    question,
                    answer,
                    file, // replace if present
                    removeFile: removeExistingFile, // remove if true
                });
                toast.success("Riddle updated successfully!");
            } else {
                await createRiddle({
                    question,
                    answer,
                    file,
                });
                toast.success("Riddle created successfully!");
            }

            onSuccess?.();

            // Reset after create; for edit you usually close the modal anyway
            if (!isEdit) {
                setQuestion("");
                setAnswer("");
                removeSelectedFile();
            } else {
                // If edit succeeded and we removed file / replaced file, clear local selection state.
                removeSelectedFile();
            }
        } catch (err: unknown) {
let msg;

if (axios.isAxiosError(err)) {
    msg = err.response?.data?.detail ?? err.response?.data ?? err.message;
} else if (err instanceof Error) {
    msg = err.message;
} else {
    msg = isEdit ? "Failed to update riddle" : "Failed to create riddle";
}

            logFrontend({
                level: "ERROR",
                message: `${isEdit ? "Failed to update riddle" : "Failed to create riddle"}: ${String(msg)}`,
                component: "RiddleForm.tsx",
                url: globalThis.location.href,
            });

            toast.error(typeof msg === "string" ? msg : "Request failed");
        } finally {
            setIsSubmitting(false);
        }
    }

    const title = isEdit ? "Edit Riddle" : "Create New Riddle";

    return (
        <div className="max-w-2xl mx-auto py-6">
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {title}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">
                                Riddle Question <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="question"
                                placeholder="e.g., What has keys but can't open locks?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer">
                                Answer <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="answer"
                                placeholder="e.g., A piano"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Existing attachment (edit mode) */}
                    {isEdit && existingFileUrl && (
                        <div className="space-y-2">
                            <Label>Current Attachment</Label>
                            <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/20">
                                <a
                                    href={existingFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline break-all"
                                >
                                    {existingFileUrl}
                                </a>

                                <Button
                                    type="button"
                                    variant={removeExistingFile ? "destructive" : "outline"}
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        // if you remove existing, also clear any newly selected replacement
                                        setRemoveExistingFile((v) => !v);
                                        removeSelectedFile();
                                    }}
                                    className="gap-2"
                                    title="Remove current attachment"
                                >
                                    <X className="w-4 h-4" />
                                    {removeExistingFile ? "Will remove" : "Remove"}
                                </Button>
                            </div>

                            {removeExistingFile && (
                                <p className="text-xs text-destructive">
                                    Attachment will be deleted when you save.
                                </p>
                            )}
                        </div>
                    )}

                    {/* File Dropzone (new file for create, or replacement for edit) */}
                    <div className="space-y-2">
                        <Label>{isEdit ? "Replace Attachment (Optional)" : "Attachment (Optional)"}</Label>

                        {file ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {file.type.startsWith("image/") && previewUrl && (
                                        <img src={previewUrl} alt="preview" className="h-10 w-10 object-cover rounded-md" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate max-w-[200px]">{file.name}</div>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                            {file.type}
                                        </Badge>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={removeSelectedFile}
                                    disabled={isSubmitting}
                                    className="text-muted-foreground hover:text-destructive"
                                    type="button"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <label
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                htmlFor="file-input"
                                className={[
                                    "rounded-lg border-2 border-dashed p-8 cursor-pointer transition flex flex-col items-center justify-center text-center gap-2",
                                    isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/30",
                                    isSubmitting ? "opacity-50 pointer-events-none" : "",
                                ].join(" ")}
                            >
                                <input
                                    id="file-input"
                                    ref={inputRef}
                                    type="file"
                                    onChange={onPick}
                                    className="hidden"
                                    accept="image/*,audio/*,video/*,application/pdf"
                                />
                                <UploadCloud className="w-10 h-10 text-muted-foreground" />
                                <div className="space-y-1">
                                    <div className="font-semibold text-sm">Click to upload or drag and drop</div>
                                    <div className="text-xs text-muted-foreground">Image, Audio, Video, or PDF (Max 100MB)</div>
                                </div>
                            </label>
                        )}
                    </div>

                    <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (isEdit ? "Saving..." : "Uploading & Creating...") : isEdit ? "Save Changes" : "Create Riddle"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
