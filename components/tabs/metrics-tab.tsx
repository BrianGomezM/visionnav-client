'use client'

import { RefreshCw, BarChart2, Clock, Package, AlertCircle, Info, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { LatencyChart } from '@/components/metrics/latency-chart'
import { PercentileBar } from '@/components/metrics/percentile-bar'
import { ScenarioDistribution } from '@/components/metrics/scenario-distribution'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMetricsSummary, useMetricsLatency, useMetricsSession } from '@/hooks/use-metrics'
import { cn } from '@/lib/utils'

/** Icono de ayuda con tooltip explicativo, para usar junto a etiquetas técnicas. */
function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground align-middle" aria-label="Ayuda">
          <HelpCircle className="w-3.5 h-3.5 inline" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-left">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

interface MetricsTabProps {
  baseUrl: string
  isActive: boolean
}

/** Tarjeta de métrica individual con icono y valor principal. */
function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = '#1D9E75',
  bgColor = '#E1F5EE',
  tooltip,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: string
  bgColor?: string
  tooltip?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          {label}
          {tooltip && <HelpTip>{tooltip}</HelpTip>}
        </p>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

/**
 * Pestaña de Métricas — muestra resumen de producción, gráfico de latencias,
 * percentiles de tiempo de respuesta y distribución de escenarios detectados.
 *
 * Fuentes de datos:
 *   GET /api/metrics/summary  — métricas agregadas con percentiles
 *   GET /api/metrics/latency  — historial de latencias para el gráfico
 *   GET /api/metrics          — métricas de sesión en memoria
 */
export function MetricsTab({ baseUrl, isActive }: MetricsTabProps) {
  const summary = useMetricsSummary(baseUrl, isActive)
  const latency = useMetricsLatency(baseUrl, 100, isActive)
  const session = useMetricsSession(baseUrl, isActive)

  const refreshAll = () => {
    summary.refresh()
    latency.refresh()
    session.refresh()
  }

  const isLoading = summary.isLoading || latency.isLoading || session.isLoading
  const hasError = summary.error || latency.error || session.error
  const hasData = !!summary.data || !!latency.data || !!session.data

  const maxMs =
    summary.data?.tiempo_total_ms?.max ??
    summary.data?.tiempo_total_ms?.p99 ??
    1000

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#1D9E75]" />
            Métricas de producción
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Estadísticas de rendimiento acumuladas desde el último inicio del servidor.
            Los percentiles se calculan sobre las últimas 500 solicitudes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Error */}
      {hasError && (
        <ErrorCard
          message={
            summary.error ??
            latency.error ??
            session.error ??
            'Error al cargar métricas'
          }
        />
      )}

      {/* Cargando */}
      {isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-[#1D9E75] mb-3" />
          <p className="text-muted-foreground text-sm">Cargando métricas...</p>
        </div>
      )}

      {/* Sin datos todavía */}
      {summary.data?.message && !summary.data.total_solicitudes && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
          <Info className="w-5 h-5 shrink-0" />
          <span>
            {summary.data.message}{' '}
            <strong className="text-foreground">Usa la pestaña «Detectar»</strong> para registrar solicitudes.
          </span>
        </div>
      )}

      {/* ── Métricas clave ── */}
      {summary.data && summary.data.total_solicitudes > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total solicitudes"
              value={summary.data.total_solicitudes}
              icon={BarChart2}
              tooltip="Número total de imágenes procesadas por /api/detect desde el último inicio del servidor. Cada una cuenta como una solicitud, sin importar cuántos objetos haya detectado."
            />
            <MetricCard
              label="Latencia promedio"
              value={
                summary.data.tiempo_total_ms.promedio !== null
                  ? `${summary.data.tiempo_total_ms.promedio.toFixed(0)} ms`
                  : '—'
              }
              sub="tiempo total por solicitud"
              icon={Clock}
              color="#7F77DD"
              bgColor="#EEEDFE"
              tooltip="Tiempo promedio, en milisegundos, entre que llega la imagen y se entrega la respuesta completa (detección + narrativa + audio). 1000 ms = 1 segundo."
            />
            <MetricCard
              label="Objetos promedio"
              value={summary.data.objetos_por_imagen.promedio ?? '—'}
              sub="por imagen procesada"
              icon={Package}
              color="#BA7517"
              bgColor="#FAEEDA"
              tooltip="Cantidad promedio de objetos que YOLO26s detecta por imagen, considerando todas las solicitudes registradas."
            />
            <MetricCard
              label="Máximo detectado"
              value={summary.data.objetos_por_imagen.max ?? '—'}
              sub="objetos en una sola imagen"
              icon={AlertCircle}
              color="#0EA5E9"
              bgColor="#E0F2FE"
              tooltip="La imagen con más objetos detectados de todo el historial. Útil para saber qué tan compleja puede llegar a ser una escena real."
            />
          </div>

          {/* Periodo */}
          {summary.data.periodo.desde && (
            <p className="text-xs text-muted-foreground text-center">
              Periodo:{' '}
              {new Date(summary.data.periodo.desde).toLocaleString('es-CO')}{' '}
              →{' '}
              {new Date(summary.data.periodo.hasta ?? '').toLocaleString('es-CO')}
            </p>
          )}

          {/* Percentiles y distribución */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Percentiles de latencia */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1D9E75]" />
                Percentiles de latencia total
                <HelpTip>
                  Un percentil "pX" indica el tiempo bajo el cual queda el X% de las solicitudes.
                  Por ejemplo, p95 = 3000 ms significa que el 95% de las solicitudes respondieron
                  en 3 segundos o menos; solo el 5% (las más lentas) tardó más. p50 es la mediana:
                  la mitad de las solicitudes fue más rápida y la mitad más lenta.
                </HelpTip>
              </h3>
              <div className="space-y-3">
                <PercentileBar
                  label="p50 (mediana)"
                  value={summary.data.tiempo_total_ms.p50}
                  max={maxMs}
                  color="#1D9E75"
                />
                <PercentileBar
                  label="p90"
                  value={summary.data.tiempo_total_ms.p90}
                  max={maxMs}
                  color="#7F77DD"
                />
                <PercentileBar
                  label="p95"
                  value={summary.data.tiempo_total_ms.p95}
                  max={maxMs}
                  color="#BA7517"
                />
                <PercentileBar
                  label="p99"
                  value={summary.data.tiempo_total_ms.p99}
                  max={maxMs}
                  color="#E24B4A"
                />
                <PercentileBar
                  label="máximo"
                  value={summary.data.tiempo_total_ms.max}
                  max={maxMs}
                  color="#6B7280"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Detección YOLO</p>
                <PercentileBar
                  label="promedio"
                  value={summary.data.tiempo_deteccion_ms.promedio}
                  max={maxMs}
                  color="#1D9E75"
                />
                <PercentileBar
                  label="p95"
                  value={summary.data.tiempo_deteccion_ms.p95}
                  max={maxMs}
                  color="#E24B4A"
                />
              </div>
            </div>

            {/* Distribución de escenarios */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                Escenarios detectados
                <HelpTip>
                  Cuántas veces el clasificador de escenario asignó cada categoría (comedor,
                  sala de estar, espacio exterior, etc.) a las imágenes procesadas. Ayuda a ver
                  si el sistema tiende a favorecer ciertas categorías sobre otras.
                </HelpTip>
              </h3>
              <ScenarioDistribution data={summary.data.escenarios_detectados} />
            </div>
          </div>
        </>
      )}

      {/* ── Gráfico de latencias ── */}
      {latency.data && latency.data.count > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7F77DD]" />
            Evolución de latencia — últimas {latency.data.count} solicitudes
          </h3>
          <LatencyChart data={latency.data.data} />
        </div>
      )}

      {/* ── Métricas de sesión en memoria ── */}
      {session.data && session.data.total_requests > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium text-foreground mb-4">
            Sesión actual (en memoria)
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Solicitudes sesión</p>
              <p className="text-lg font-semibold text-foreground">{session.data.total_requests}</p>
            </div>
            {session.data.tiempos_promedio_ms && (
              <>
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground">Tiempo promedio total</p>
                  <p className="text-lg font-semibold text-foreground">
                    {session.data.tiempos_promedio_ms.total.toFixed(0)} ms
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground">LLM promedio</p>
                  <p className="text-lg font-semibold text-foreground">
                    {session.data.tiempos_promedio_ms.llm.toFixed(0)} ms
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground">TTS promedio</p>
                  <p className="text-lg font-semibold text-foreground">
                    {session.data.tiempos_promedio_ms.tts.toFixed(0)} ms
                  </p>
                </div>
              </>
            )}
          </div>

          {session.data.tts && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#0F6E56]">
                TTS exitoso: {session.data.tts.exitoso}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#FCEBEB] text-[#E24B4A]">
                TTS fallido: {session.data.tts.fallido}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                Tasa éxito TTS: {session.data.tts.tasa_exito}
              </span>
              <HelpTip>
                "Fallido" cuenta las veces que Gemini TTS no devolvió audio (por ejemplo, un
                error temporal del servicio de Google): la narrativa igual se entrega en texto,
                pero sin audio. No indica un error del detector ni de la narrativa.
              </HelpTip>
            </div>
          )}
        </div>
      )}

      {/* Info académica */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Nota académica:</strong> Las métricas registradas
          se usan para evaluar el requisito A28 de la tesis (tiempo de respuesta objetivo ≤ 5 s).
          Los datos de latencia se persisten en{' '}
          <code className="font-mono bg-muted px-1 rounded">metrics/production_metrics.jsonl</code>.
        </p>
      </div>
    </div>
  )
}
