import { uploadQuestions } from "@/api/QuestionsAPI";
import { useRef, useState, type ComponentProps, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface UploadQuestionsJSONButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
    textWhileUploading?: ReactNode;
}

const UploadQuestionsJSONButton: React.FC<PropsWithChildren<UploadQuestionsJSONButtonProps>> = (props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { children, textWhileUploading } = props;

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
            {...props}
            onClick={() => {
                fileInputRef.current?.click()
            }}
        >
            {(isUploading && textWhileUploading) ? textWhileUploading : children }
        </Button>
    </>
}

export default UploadQuestionsJSONButton;