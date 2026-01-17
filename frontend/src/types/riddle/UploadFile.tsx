export type UploadFile = {
    id: string;
    file: File;
    status: "queued" | "uploading" | "uploaded" | "error";
    error?: string;
    uploadedUrl?: string;
    uploadedPath?: string;
};