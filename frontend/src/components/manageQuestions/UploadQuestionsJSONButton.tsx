import { uploadQuestions } from "@/api/QuestionsAPI";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";

const UploadQuestionsJSONButton: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target?.result as string);
                setIsUploading(true);

                await uploadQuestions(jsonData);
                toast.success("Questions uploaded successfully!");
            } catch (error) {
                console.error("Error uploading questions:", error);
                toast.error("Failed to upload questions. Please check the console for details.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""; // Reset the file input
                }
            }
        };
        reader.readAsText(file);
    };

    return <>
        <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />
        <Button
            variant="default"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
        >
            {isUploading ? "Uploading..." : "Upload JSON"}
        </Button>
    </>
}

export default UploadQuestionsJSONButton;