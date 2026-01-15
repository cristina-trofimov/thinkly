import { AlgoTimeSessionForm } from '../../components/forms/AlgoTimeForm';
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ManageAlgoTimePage() {
  const navigate = useNavigate();
  return (
    
    <div className="flex justify-center ">
      
    <div className="relative w-[95%] mt-8 justify-center shadow border border-primary/30 p-6 rounded-lg flex flex-col gap-4 ">
    <Button variant="ghost" size="sm" className="absolute -top-12 left-0 text-muted-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create a New AlgoTime Session
        </h1>
        <p className="text-gray-600">
          Fill in the details below to create a new Session.
        </p>
      </div>
      {/* Form Component */}
      <AlgoTimeSessionForm />
    </div>
    </div>
  );
}
