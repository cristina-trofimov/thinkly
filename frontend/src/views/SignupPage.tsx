import { SignupForm } from "@/components/forms/SignupForm";
// import FileUploadDropzone from "@/components/forms/FileUpload";

export default function SignupPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <SignupForm />
                {/* <FileUploadDropzone /> */}
            </div>
        </div>
    )
}
