import { Trophy, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/helpers/TimeInput";
import DatePicker from "@/helpers/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GeneralInfoCardProps {
  data: {
    name?: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  };
  errors?: Record<string, boolean>;
  onChange: (updates: Partial<GeneralInfoCardProps["data"]>) => void;

  //Optional Features - For Algotime Form

  showName?: boolean;
  nameRequired?: boolean;

  repeatData?: {
    repeatType: string;
    repeatEndDate: string;
  };

  cooldown?: string;

  onRepeatChange?: (updates: {
    repeatType?: string;
    repeatEndDate?: string;
  }) => void;

  onCooldownChange?: (value: string) => void;
}

const Required = () => <span className="text-destructive ml-1">*</span>;

export function GeneralInfoCard({ data, errors = {}, onChange, repeatData, cooldown, onRepeatChange, onCooldownChange,showName,nameRequired }: Readonly<GeneralInfoCardProps>) {
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
      {showName && (
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className={getLabelClass(errors.name)}
            >
              Name
              {nameRequired && <Required />}
            </Label>

            <Input
              id="name"
              className={getInputClass(errors.name)}
              aria-invalid={errors.name || undefined} 
              value={data.name || ""}
              onChange={e =>
                onChange({ name: e.target.value })
              }
            />
          </div>
      )}
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
          {repeatData && onRepeatChange && (
           <>
           <div className="space-y-2 mt-4">
          <div className="space-y-2 gap-4">
            <Label>Repeat</Label>

            <Select
              value={repeatData.repeatType}
              onValueChange={(value) =>
                onRepeatChange({ repeatType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          {repeatData.repeatType !== "none" && (
            <div className="space-y-2 mt-4">
            <div className="space-y-2">
              <Label>Repeat End Date</Label>

              <DatePicker
                value={repeatData.repeatEndDate}
                onChange={(v) =>
                  onRepeatChange({ repeatEndDate: v })
                }
              />
            </div>
            </div>
          )}
        </>
      )}
          {/* </div> */}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className={getLabelClass(errors.startTime)}>Start Time (EST)<Required /></Label>
            <div className={errors.startTime ? "rounded-md ring-1 ring-destructive" : ""}>
              <TimeInput id="startTime" value={data.startTime} onChange={v => onChange({ startTime: v })} aria-invalid={errors.startTime || undefined} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime" className={getLabelClass(errors.endTime)}>End Time (EST)<Required /></Label>
            <div className={errors.endTime ? "rounded-md ring-1 ring-destructive" : ""}>
              <TimeInput id="endTime" value={data.endTime} onChange={v => onChange({ endTime: v })} aria-invalid={errors.startTime || undefined}/>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
          <Input id="location" value={data.location} onChange={e => onChange({ location: e.target.value })} placeholder="Online or Physical Address" aria-invalid={errors.location || undefined} />
        </div>
        
      {cooldown !== undefined && onCooldownChange && (
        <div className="space-y-2">
          <Label>Question Cooldown (seconds)</Label>

          <Input
            type="number"
            value={cooldown}
            onChange={(e) => onCooldownChange(e.target.value)}
            placeholder="Optional"
          />
        </div>
      )}
      </CardContent>
    </Card>
  );
}