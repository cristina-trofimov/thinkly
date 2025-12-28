
//Uncomment SignupPage.tsx to see this component in action

import { useMemo, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { createClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { UploadFile } from "@/types/riddle/UploadFile";

// Supabase setup ADD .env file in cd/frontend with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnon);


//Function to preview different file types FOR VALIDATION & can be used when displaying riddles in competitions no need when uploading riddle files
function FilePreview({ url, mimeType }: { url: string; mimeType: string }) {
    if (mimeType.startsWith("image/")) return <img src={url} alt="preview" className="w-full rounded-xl" />;

    if (mimeType.startsWith("audio/"))
        return (
            <audio controls className="w-full">
                <source src={url} type={mimeType} />
            </audio>
        );

    if (mimeType.startsWith("video/"))
        return (
            <video controls className="w-full rounded-xl">
                <source src={url} type={mimeType} />
            </video>
        );

    if (mimeType === "application/pdf")
        return <iframe src={url} className="w-full h-[650px] rounded-xl border" />;

    return (
        <a className="underline" href={url} target="_blank" rel="noreferrer">
            Open / Download
        </a>
    );
}

export default function FileUploadDropzone() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [isOver, setIsOver] = useState(false);
    const [items, setItems] = useState<UploadFile[]>([]);
    const [error, setError] = useState<string>("");
    const [overallProgress, setOverallProgress] = useState<number>(0);

//In my supabase storage settings, my bucket is called "uploads" with "public" folder with public access
    const bucket = "uploads";
    const folder = "public";

    const hasQueued = useMemo(() => items.some((i) => i.status === "queued"), [items]);
    const isUploading = useMemo(() => items.some((i) => i.status === "uploading"), [items]);

    function openPicker() {
        inputRef.current?.click();
    }

    function validateFile(file: File) {

//I set max file size to 100MB and only allow image/audio/video/pdf files
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

    function addFiles(fileList: FileList | File[]) {
        setError("");

        const next: UploadFile[] = [];
        for (const file of Array.from(fileList)) {
            const v = validateFile(file);
            if (v) {
                setError(v);
                continue;
            }

            const id =
                typeof crypto?.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${Math.random().toString(16).slice(2)}${Date.now()}`;

            next.push({ id, file, status: "queued" });
        }

        // append
        setItems((prev) => [...prev, ...next]);
    }

    function onPick(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.files?.length) addFiles(e.target.files);
        e.target.value = "";
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    }

    function onDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
    }

    function onDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
    }

    function removeQueued(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }

    function clearQueued() {
        if (isUploading) return;
        setItems([]);
        setOverallProgress(0);
        setError("");
    }

    async function uploadAll() {
        setError("");
        setOverallProgress(0);

        const queued = items.filter((i) => i.status === "queued");
        if (queued.length === 0) return;

        let completed = 0;

        setItems((prev) =>
            prev.map((i) => (i.status === "queued" ? { ...i, status: "uploading", error: undefined } : i))
        );

        //Upload one by one & fills attribute publicURL and uploadedPath *see frontend/src/types/riddle/UploadFile.tsx
        for (const it of queued) {
            try {
                const safeName = it.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const path = `${folder}/${Date.now()}_${it.id}_${safeName}`;

                const { error: uploadError } = await supabase.storage.from(bucket).upload(path, it.file, {
                    upsert: false,
                    contentType: it.file.type,
                    cacheControl: "3600",
                });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from(bucket).getPublicUrl(path);

                setItems((prev) =>
                    prev.map((x) =>
                        x.id === it.id
                            ? { ...x, status: "uploaded", uploadedUrl: data.publicUrl, uploadedPath: path }
                            : x
                    )
                );
            } catch (err: any) {
                setItems((prev) =>
                    prev.map((x) => (x.id === it.id ? { ...x, status: "error", error: err?.message ?? "Upload failed" } : x))
                );
            } finally {
                completed += 1;
                setOverallProgress(Math.round((completed / queued.length) * 100));
            }
        }
    }

    return (
        <div className="max-w-3xl">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl">Upload files</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div
                        onClick={openPicker}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        className={[
                            "rounded-2xl border-2 border-dashed p-6 cursor-pointer select-none transition",
                            isOver ? "border-foreground bg-muted/50" : "border-muted-foreground/30",
                        ].join(" ")}
                        role="button"
                        tabIndex={0}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            onChange={onPick}
                            className="hidden"
                            accept="image/*,audio/*,video/*,application/pdf"
                        />

                        <div className="space-y-1">
                            <div className="font-semibold">Drag & drop files here</div>
                            <div className="text-sm text-muted-foreground">or click to browse (image / audio / video / PDF)</div>
                        </div>
                    </div>


                    <div className="flex flex-wrap gap-2">
                        <Button onClick={uploadAll} disabled={!hasQueued || isUploading}>
                            Upload
                        </Button>

                        <Button variant="secondary" onClick={openPicker} disabled={isUploading}>
                            Add more
                        </Button>

                        <Button variant="ghost" onClick={clearQueued} disabled={isUploading || items.length === 0}>
                            Clear
                        </Button>
                    </div>


                    {isUploading && (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Uploading…</div>
                            <Progress value={overallProgress} />
                        </div>
                    )}


                    {error && <div className="text-sm text-red-600">{error}</div>}


                    {items.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                {items.map((it) => {
                                    const badge = it.file.type;
                                    return (
                                        <div key={it.id} className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="truncate font-medium">{it.file.name}</div>
                                                    <Badge variant="secondary" className="rounded-xl">
                                                        {badge}
                                                    </Badge>
                                                </div>

                                                <div className="text-xs text-muted-foreground">
                                                    {it.status === "queued" && "Ready to upload"}
                                                    {it.status === "uploading" && "Uploading…"}
                                                    {it.status === "uploaded" && "Uloaded"}
                                                    {it.status === "error" && `error: ${it.error ?? "Upload failed"}`}
                                                </div>
                                            </div>


                                            <Button
                                                variant="outline"
                                                className="rounded-xl"
                                                onClick={() => removeQueued(it.id)}
                                                disabled={it.status === "uploading"}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/*  Preview last uploaded file for VALIDATION purposes */}
            {items.some((i) => i.status === "uploaded" && i.uploadedUrl) && (
                <Card className="mt-4 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg">Preview (last uploaded)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(() => {
                            const last = [...items].reverse().find((i) => i.status === "uploaded" && i.uploadedUrl);
                            if (!last?.uploadedUrl) return null;
                            return <FilePreview url={last.uploadedUrl} mimeType={last.file.type} />;
                        })()}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
