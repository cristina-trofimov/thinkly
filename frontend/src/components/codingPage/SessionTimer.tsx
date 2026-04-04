interface SessionTimerProps {
  readonly remainingMs: number | null;
}

export function SessionTimer({ remainingMs }: Readonly<SessionTimerProps>) {
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

  const dotClass = isExpired
    ? 'bg-destructive'
    : isUrgent
      ? 'bg-destructive animate-pulse'
      : isWarning
        ? 'bg-amber-500 animate-pulse'
        : 'bg-emerald-500'

  const containerClass = isExpired || isUrgent
    ? 'bg-destructive/10 border-destructive/30 text-destructive'
    : isWarning
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
      : 'bg-muted border-border text-muted-foreground'

  return (
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium tabular-nums
      transition-colors duration-500
      ${isUrgent && !isExpired ? 'animate-pulse' : ''}
      ${containerClass}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {isExpired ? "Time's up" : display}
    </div>
  )
}
