'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { LatencyPoint } from '@/hooks/use-metrics'

interface LatencyChartProps {
  data: LatencyPoint[]
}

/**
 * Gráfico de líneas que muestra la evolución de la latencia total
 * y de detección YOLO en las últimas N solicitudes registradas.
 */
export function LatencyChart({ data }: LatencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos de latencia disponibles.
      </div>
    )
  }

  // Formatea el timestamp a HH:MM:SS para la etiqueta del eje X
  const formatted = data.map((pt, idx) => ({
    idx: idx + 1,
    hora: pt.ts ? new Date(pt.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx + 1}`,
    total_ms: pt.total_ms ?? null,
    deteccion_ms: pt.deteccion_ms ?? null,
    objetos: pt.objetos ?? 0,
    escenario: pt.escenario ?? '—',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="idx"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          label={{ value: 'Solicitud #', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          unit=" ms"
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [
            `${value?.toFixed(1)} ms`,
            name === 'total_ms' ? 'Total' : 'Detección YOLO',
          ]}
          labelFormatter={(label) => `Solicitud #${label}`}
        />
        <Legend
          formatter={(value) => (value === 'total_ms' ? 'Total' : 'Detección YOLO')}
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Line
          type="monotone"
          dataKey="total_ms"
          stroke="#1D9E75"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="deteccion_ms"
          stroke="#7F77DD"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
