import { cn } from '@/lib/utils'

interface ZoneBarProps {
  label: string
  percentage: number
}

export function ZoneBar({ label, percentage }: ZoneBarProps) {
  const getColor = (pct: number) => {
    if (pct < 40) return { bg: '#E1F5EE', fill: '#1D9E75', text: '#0F6E56' }
    if (pct < 70) return { bg: '#FAEEDA', fill: '#BA7517', text: '#BA7517' }
    return { bg: '#FCEBEB', fill: '#E24B4A', text: '#E24B4A' }
  }

  const getStatusLabel = (pct: number) => {
    if (pct < 40) return 'libre'
    if (pct < 70) return 'parcial'
    return 'bloqueado'
  }

  const colors = getColor(percentage)
  const status = getStatusLabel(percentage)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground capitalize">{label}</span>
        <span style={{ color: colors.text }} className="text-xs font-medium">
          {percentage.toFixed(0)}% ({status})
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.bg }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: colors.fill 
          }}
        />
      </div>
    </div>
  )
}
