interface ScenarioDistributionProps {
  data: Record<string, number>
}

const SCENARIO_COLORS: Record<string, string> = {
  sala: '#1D9E75',
  cocina: '#F59E0B',
  exterior: '#0EA5E9',
  oficina: '#7F77DD',
  pasillo: '#E24B4A',
  dormitorio: '#BA7517',
  bano: '#6B7280',
  desconocido: '#9CA3AF',
}

function getColor(key: string): string {
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(SCENARIO_COLORS)) {
    if (lower.includes(k)) return v
  }
  return '#6B7280'
}

/**
 * Visualiza la distribución de escenarios detectados como barras horizontales
 * proporcionales al total de solicitudes.
 */
export function ScenarioDistribution({ data }: ScenarioDistributionProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin datos de escenarios aún.</p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0
        const color = getColor(key)
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="capitalize text-foreground font-medium">{key}</span>
              <span className="text-muted-foreground">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
