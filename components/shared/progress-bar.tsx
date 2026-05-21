import { cn } from '@/lib/utils'

interface ProgressBarProps {
  isActive: boolean
  className?: string
}

export function ProgressBar({ isActive, className }: ProgressBarProps) {
  if (!isActive) return null

  return (
    <div className={cn('h-1 w-full bg-muted rounded-full overflow-hidden', className)}>
      <div className="h-full w-full animate-shimmer" />
    </div>
  )
}
