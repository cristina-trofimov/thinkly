import { Trash2, UploadCloud, FileText } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Services
import { createRiddle } from "@/api/RiddlesAPI";

// Supabase setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnon);

export default function CreateRiddleForm() {
    // Form State
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    
    // File State (Single file only)
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // UI State
    const [isOver, setIsOver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Config
    const bucket = "uploads";
    const folder = "public";

    // --- File Handling ---

    function validateFile(file: File) {
        const maxMB = 100;
        if (file.size > maxMB * 1024 * 1024) return `File too large. Max ${maxMB}MB.`;
        
        const ok =
            file.type.startsWith("image/") ||
            file.type.startsWith("audio/") ||
            file.type.startsWith("video/") ||
            file.type === "application/pdf";

        if (!ok) return "Unsupported file type. Use image/audio/video/pdf.";
        return "";
    }

    function handleFileSelect(selectedFile: File) {
        const error = validateFile(selectedFile);
        if (error) {
            toast.error(error);
            return;
        }

        // Create a local preview URL
        const objectUrl = URL.createObjectURL(selectedFile);
        
        setFile(selectedFile);
        setPreviewUrl(objectUrl);
    }

    function onPick(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.files?.[0]) {
            handleFileSelect(e.target.files[0]);
        }
        e.target.value = ""; // reset input
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }

    function removeFile() {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    }

    // --- Drag Visuals ---
    function onDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsOver(true); }
    function onDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsOver(false); }

    // --- Submission Logic ---

    async function handleSubmit() {
        // 1. Basic Validation
        if (!question.trim() || !answer.trim()) {
            toast.error("Question and Answer are required.");
            return;
        }

        setIsSubmitting(true);
        let uploadedPublicUrl: string | null = null;

        try {
            // 2. Upload File (if exists)
            if (file) {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const path = `${folder}/${Date.now()}_${safeName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(path, file, {
                        upsert: false,
                        contentType: file.type,
                        cacheControl: "3600",
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from(bucket).getPublicUrl(path);
                uploadedPublicUrl = data.publicUrl;
            }

            // 3. Create Riddle in Backend
            await createRiddle({
                question: question,
                answer: answer,
                file: uploadedPublicUrl
            });

            toast.success("Riddle created successfully!");
            
            // 4. Reset Form
            setQuestion("");
            setAnswer("");
            removeFile();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create riddle");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-10">
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Create New Riddle
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">Riddle Question <span className="text-red-500">*</span></Label>
                            <Input 
                                id="question" 
                                placeholder="e.g., What has keys but can't open locks?" 
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer">Answer <span className="text-red-500">*</span></Label>
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

                    {/* File Dropzone */}
                    <div className="space-y-2">
                        <Label>Attachment (Optional)</Label>
                        
                        {!file ? (
                            <div
                                onClick={() => inputRef.current?.click()}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                className={[
                                    "rounded-lg border-2 border-dashed p-8 cursor-pointer transition flex flex-col items-center justify-center text-center gap-2",
                                    isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/30",
                                    isSubmitting ? "opacity-50 pointer-events-none" : ""
                                ].join(" ")}
                            >
                                <input
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
                            </div>
                        ) : (
                            // Selected File View
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Mini Preview Thumbnail */}
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
                                    onClick={removeFile}
                                    disabled={isSubmitting}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button 
                        onClick={handleSubmit} 
                        className="w-full" 
                        size="lg"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Uploading & Creating..." : "Create Riddle"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}