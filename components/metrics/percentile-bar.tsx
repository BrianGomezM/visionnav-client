interface PercentileBarProps {
  label: string
  value: number | null
  max: number
  color?: string
}

/**
 * Barra visual de percentil con etiqueta y valor en ms.
 * Útil para representar p50, p90, p95, p99 de latencia.
 */
export function PercentileBar({ label, value, max, color = '#1D9E75' }: PercentileBarProps) {
  const pct = value !== null && max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-mono text-foreground">
          {value !== null ? `${value.toFixed(1)} ms` : '—'}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
