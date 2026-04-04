import { Timer } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TimesUpDialogProps {
  redirectCountdown: number | null;
}

export function TimesUpDialog({ redirectCountdown }: TimesUpDialogProps) {
  return (
    <Dialog open={redirectCountdown !== null}>
      <DialogContent className="sm:max-w-sm text-center" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Timer className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-semibold">Time's Up!</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Your session has ended. Thanks for participating!
          </p>
          <p className="text-sm">
            Redirecting you to the home page in{' '}
            <span className="font-bold text-primary">{redirectCountdown}s</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
