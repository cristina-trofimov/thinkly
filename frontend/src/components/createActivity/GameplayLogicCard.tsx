import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface GameplayLogicCardProps {
  questionCooldown: string;
  riddleCooldown: string;
  onChange: (updates: { questionCooldownTime?: string; riddleCooldownTime?: string }) => void;
}

export function GameplayLogicCard({ questionCooldown, riddleCooldown, onChange }: Readonly<GameplayLogicCardProps>) {
  const handleNumericChange = (key: string, val: string) => {
    const cleanVal = Math.max(0, Number(val)).toString();
    onChange({ [key]: cleanVal });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Gameplay Logic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qCool">Question Cooldown (s)</Label>
          <Input
            id="qCool"
            type="number"
            min="0"
            value={questionCooldown}
            onChange={(e) => handleNumericChange("questionCooldownTime", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rCool">Riddle Cooldown (s)</Label>
          <Input
            id="rCool"
            type="number"
            min="0"
            value={riddleCooldown}
            onChange={(e) => handleNumericChange("riddleCooldownTime", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}