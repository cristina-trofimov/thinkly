interface CompetitionTimerProps {
  remainingMs: number | null;
}

export function CompetitionTimer({ remainingMs }: CompetitionTimerProps) {
  if (remainingMs === null) return null

  const isExpired = remainingMs === 0
  const isWarning = remainingMs < 5 * 60 * 1000
  const isUrgent = remainingMs < 60 * 1000

  const totalSeconds = Math.floor(remainingMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return (
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium tabular-nums
      transition-colors duration-500
      ${isUrgent && !isExpired ? 'animate-pulse' : ''}
      ${isExpired || isUrgent
        ? 'bg-destructive/10 border-destructive/30 text-destructive'
        : isWarning
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          : 'bg-muted border-border text-muted-foreground'
      }
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-destructive' :
        isUrgent ? 'bg-destructive animate-pulse' :
          isWarning ? 'bg-amber-500 animate-pulse' :
            'bg-emerald-500'
        }`} />
      {isExpired ? "Time's up" : display}
    </div>
  )
}
