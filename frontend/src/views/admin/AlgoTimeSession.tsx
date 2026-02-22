import { AlgoTimeSessionForm } from '../../components/forms/AlgoTimeForm';
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ManageAlgoTimePage() {
  const navigate = useNavigate();
  return (
    
    <div className="flex justify-center ">
      
    <div className="relative w-[95%] mt-6 justify-center  p-6 rounded-lg flex flex-col gap-4 ">
    <Button variant="ghost" size="sm" className="absolute -top-12 left-0 text-muted-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
      <AlgoTimeSessionForm />
    </div>
    </div>
  );
}
