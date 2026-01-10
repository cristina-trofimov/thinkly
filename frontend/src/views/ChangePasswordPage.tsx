import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "../components/ui/label";
import { Input } from "@/components/ui/input";

function ChangePasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-6 px-6 pb-6 pt-2 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Change Password</h1>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-3xl border-muted/20 shadow-md">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                Current Password
              </Label>
              <Input
                value=""
                className="h-9 focus-visible:ring-[#8065CD]"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                New Password
              </Label>
              <Input
                value=""
                className="h-9 focus-visible:ring-[#8065CD]"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                New Password (again)
              </Label>
              <Input
                value=""
                className="h-9 focus-visible:ring-[#8065CD]"
                autoFocus
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ChangePasswordPage;