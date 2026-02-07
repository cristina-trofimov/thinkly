import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
}

export function NotificationsCard({
  emailEnabled, setEmailEnabled, emailToAll, setEmailToAll, emailData, onEmailDataChange, onManualEdit
}: Readonly<NotificationsCardProps>) {
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
          <Switch id="enEmail" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        </div>
        {emailEnabled && (
          <div className="space-y-4 pt-2 border-t mt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="allPart" className="text-xs">Send to all participants</Label>
              <Switch id="allPart" checked={emailToAll} onCheckedChange={setEmailToAll} />
            </div>
            {!emailToAll && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">To (comma-separated)</Label>
                <Input value={emailData.to} onChange={e => onEmailDataChange({ to: e.target.value })} />
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
            <div className="grid gap-2">
              <Label htmlFor="sendAtLocal">Additional custom reminder</Label>
              <Input
                id="sendAtLocal"
                type="datetime-local"
                value={emailData.sendAtLocal}
                onChange={(e) => onEmailDataChange({ sendAtLocal: e.target.value })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}