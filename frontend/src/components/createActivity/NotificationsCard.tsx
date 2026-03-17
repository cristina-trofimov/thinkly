import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/helpers/TimeInput";
import DatePicker from "@/helpers/DatePicker";

interface NotificationsCardProps {
  emailEnabled: boolean;
  setEmailEnabled: (val: boolean) => void;
  emailToAll: boolean;
  setEmailToAll: (val: boolean) => void;
  emailData: {
    to: string;
    subject: string;
    body: string;
    sendAtLocal: string;
    sendInOneMinute: boolean;
  };
  onEmailDataChange: (updates: Partial<NotificationsCardProps["emailData"]>) => void;
  onManualEdit: () => void;
  isReadOnly?: boolean;
}

export function NotificationsCard({
  emailEnabled, setEmailEnabled, emailToAll, setEmailToAll, emailData, onEmailDataChange, onManualEdit, isReadOnly = false
}: Readonly<NotificationsCardProps>) {

  // Split sendAtLocal into date and time parts for the custom pickers
  const sendDate = emailData.sendAtLocal ? emailData.sendAtLocal.split("T")[0] : "";
  const sendTime = emailData.sendAtLocal ? emailData.sendAtLocal.split("T")[1]?.slice(0, 5) : "";

  const handleDateChange = (date: string) => {
    const time = sendTime || "00:00";
    onEmailDataChange({ sendAtLocal: date ? `${date}T${time}` : "" });
  };

  const handleTimeChange = (time: string) => {
    const date = sendDate || new Date().toISOString().split("T")[0];
    onEmailDataChange({ sendAtLocal: time ? `${date}T${time}` : "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enEmail">Enable Emails</Label>
          <Switch id="enEmail" checked={emailEnabled} onCheckedChange={setEmailEnabled} disabled={isReadOnly}/>
        </div>
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
          📬 By default, participants automatically receive a reminder <strong>24 hours</strong> before and <strong>5 minutes</strong> before the competition starts.
        </p>
        {emailEnabled && (
          <div className={`space-y-4 pt-2 border-t mt-2 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <Label htmlFor="allPart" className="text-xs">Send to all participants</Label>
              <Switch id="allPart" checked={emailToAll} onCheckedChange={setEmailToAll} />
            </div>
            {!emailToAll && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">To (comma-separated emails)</Label>
                <Input
                  value={emailData.to}
                  onChange={e => onEmailDataChange({ to: e.target.value })}
                  placeholder="e.g. alice@example.com, bob@example.com"
                  type="email"
                  multiple
                />
                <p className="text-xs text-muted-foreground">Enter recipient email addresses, separated by commas.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject</Label>
              <Input value={emailData.subject} onChange={e => onEmailDataChange({ subject: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message Content</Label>
              <Textarea
                rows={4}
                className="text-xs"
                value={emailData.body}
                onChange={e => { onManualEdit(); onEmailDataChange({ body: e.target.value }); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional custom reminder</Label>
              <DatePicker
                value={sendDate}
                onChange={handleDateChange}
                min={new Date().toISOString().split("T")[0]}
              />
              <TimeInput
                value={sendTime}
                onChange={handleTimeChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}