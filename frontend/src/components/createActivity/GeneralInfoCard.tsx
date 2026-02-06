import { Trophy, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/helpers/TimeInput";
import DatePicker from "@/helpers/DatePicker";

interface GeneralInfoCardProps {
  data: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  };
  errors?: Record<string, boolean>;
  onChange: (updates: Partial<GeneralInfoCardProps["data"]>) => void;
}

export function GeneralInfoCard({ data, errors = {}, onChange }: GeneralInfoCardProps) {
  const Required = () => <span className="text-destructive ml-1">*</span>;
  const getLabelClass = (isInvalid: boolean) => isInvalid ? "text-destructive" : "";
  const getInputClass = (isInvalid: boolean) => isInvalid ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> General Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className={getLabelClass(errors.name)}>Name<Required /></Label>
          <Input 
            id="name" 
            className={getInputClass(errors.name)}
            value={data.name} 
            onChange={e => onChange({ name: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date" className={getLabelClass(errors.date)}>Date<Required /></Label>
          <div className={errors.date ? "rounded-md ring-1 ring-destructive" : ""}>
            <DatePicker
              id="date"
              value={data.date}
              onChange={(v: string) => onChange({ date: v })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className={getLabelClass(errors.startTime)}>Start Time (EST)<Required /></Label>
            <div className={errors.startTime ? "rounded-md ring-1 ring-destructive" : ""}>
              <TimeInput id="startTime" value={data.startTime} onChange={v => onChange({ startTime: v })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime" className={getLabelClass(errors.endTime)}>End Time (EST)<Required /></Label>
            <div className={errors.endTime ? "rounded-md ring-1 ring-destructive" : ""}>
              <TimeInput id="endTime" value={data.endTime} onChange={v => onChange({ endTime: v })} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
          <Input id="location" value={data.location} onChange={e => onChange({ location: e.target.value })} placeholder="Online or Physical Address" />
        </div>
      </CardContent>
    </Card>
  );
}