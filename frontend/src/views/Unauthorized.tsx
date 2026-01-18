// pages/Unauthorized.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold text-red-600">403 - Unauthorized</h1>
            <p className="mt-4 text-gray-600">You do not have permission to view this page.</p>
            <Button className="mt-6" onClick={() => navigate(-1)}>
                Go Back
            </Button>
        </div>
    );
}