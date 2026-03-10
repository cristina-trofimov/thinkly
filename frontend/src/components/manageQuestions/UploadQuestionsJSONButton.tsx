import { uploadQuestions } from "@/api/QuestionsAPI";
import { useRef, useState, type ComponentProps, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "../ui/button";
import { parseAxiosErrorMessage } from "@/lib/axiosClient";

interface UploadQuestionsJSONButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
    textWhileUploading?: ReactNode;
    onSuccess?: () => void;
    onFailure?: (errorMessage: string) => void;
}

const UploadQuestionsJSONButton: React.FC<PropsWithChildren<UploadQuestionsJSONButtonProps>> = (props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { children, textWhileUploading, onSuccess, onFailure } = props;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const fileText = await file.text();
            const jsonData = JSON.parse(fileText);
            setIsUploading(true);

            await uploadQuestions(jsonData);
            onSuccess?.();
        } catch (error) {
            console.error("Error uploading questions:", error);
            const errorMessage = parseAxiosErrorMessage(error);
            onFailure?.(errorMessage);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset the file input
            }
        }
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