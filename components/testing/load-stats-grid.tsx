import { cn } from '@/lib/utils'
import type { LoadTestResult } from '@/hooks/use-testing'

interface LoadStatsGridProps {
  result: LoadTestResult
}

interface StatItem {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  color?: string
}

/**
 * Grid de estadísticas clave de una prueba de carga.
 * Muestra tasa de éxito, latencias por percentil y throughput.
 */
export function LoadStatsGrid({ result }: LoadStatsGridProps) {
  const { resultados, latencias_ms } = result

  const stats: StatItem[] = [
    {
      label: 'Solicitudes exitosas',
      value: `${resultados.exitosas} / ${resultados.exitosas + resultados.fallidas}`,
      highlight: true,
      color: resultados.tasa_exito_pct >= 90 ? '#1D9E75' : resultados.tasa_exito_pct >= 70 ? '#BA7517' : '#E24B4A',
    },
    {
      label: 'Tasa de éxito',
      value: `${resultados.tasa_exito_pct.toFixed(1)}%`,
      color: resultados.tasa_exito_pct >= 90 ? '#1D9E75' : resultados.tasa_exito_pct >= 70 ? '#BA7517' : '#E24B4A',
    },
    {
      label: 'Throughput',
      value: `${resultados.throughput_rps.toFixed(2)} req/s`,
    },
    {
      label: 'Tiempo total',
      value: `${(resultados.tiempo_total_ms / 1000).toFixed(1)} s`,
    },
    {
      label: 'Latencia p50',
      value: latencias_ms.p50 !== null ? `${latencias_ms.p50.toFixed(0)} ms` : '—',
    },
    {
      label: 'Latencia p90',
      value: latencias_ms.p90 !== null ? `${latencias_ms.p90.toFixed(0)} ms` : '—',
    },
    {
      label: 'Latencia p95',
      value: latencias_ms.p95 !== null ? `${latencias_ms.p95.toFixed(0)} ms` : '—',
    },
    {
      label: 'Latencia p99',
      value: latencias_ms.p99 !== null ? `${latencias_ms.p99.toFixed(0)} ms` : '—',
      color: latencias_ms.p99 !== null && latencias_ms.p99 > 5000 ? '#E24B4A' : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p
            className="text-lg font-semibold"
            style={{ color: stat.color ?? 'var(--foreground)' }}
          >
            {stat.value}
          </p>
          {stat.sub && (
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}
