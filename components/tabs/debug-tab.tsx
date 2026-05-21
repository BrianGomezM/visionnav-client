'use client'

import { useState, useCallback, useEffect } from 'react'
import { Terminal, Play, ArrowRight, AlertTriangle, Hand, Clock, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ImageUploader } from '@/components/shared/image-uploader'
import { ErrorCard } from '@/components/shared/error-card'
import { ProgressBar } from '@/components/shared/progress-bar'
import { PipelineStep } from '@/components/debug/pipeline-step'
import { ZoneBar } from '@/components/debug/zone-bar'
import { useDebug } from '@/hooks/use-debug'
import { cn } from '@/lib/utils'

const LOADING_MESSAGES = [
  'Iniciando pipeline de diagnóstico...',
  'Ejecutando detección YOLO...',
  'Analizando distribución espacial...',
  'Estimando distancias y pasos...',
  'Calculando espacio libre...',
  'Generando descripción con LLM...',
  'Compilando resultados del pipeline...',
]

interface DebugTabProps {
  baseUrl: string
  confidenceThreshold: number
  onHasDataChange?: (hasData: boolean) => void
}

export function DebugTab({ baseUrl, confidenceThreshold, onHasDataChange }: DebugTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const { data, isLoading, error, debug, reset } = useDebug({ baseUrl, confidenceThreshold })

  // Cycle through pipeline step messages for better perceived performance
  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIdx(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isLoading])

  // Report state to parent so it can warn before tab switching
  useEffect(() => {
    onHasDataChange?.(selectedFile !== null || data !== null || isLoading)
  }, [selectedFile, data, isLoading, onHasDataChange])

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
      reset()
    }
  }, [previewUrl, reset])

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) return
    await debug(selectedFile)
  }, [selectedFile, debug])

  const getConfidenceBar = (confidence: number) => {
    const pct = confidence * 100
    let color = '#1D9E75'
    if (confidence < 0.5) color = '#E24B4A'
    else if (confidence < 0.8) color = '#BA7517'
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
    )
  }

  const getSituationIcon = (situacion: string) => {
    switch (situacion) {
      case 'clear':
        return <ArrowRight className="w-5 h-5 text-[#1D9E75]" />
      case 'front_blocked':
        return <AlertTriangle className="w-5 h-5 text-[#BA7517]" />
      case 'blocked':
        return <Hand className="w-5 h-5 text-[#E24B4A]" />
      default:
        return <ArrowRight className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left column — Input */}
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Diagnóstico del pipeline
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Analiza paso a paso el proceso de detección y generación de narrativa.
          </p>

          <ImageUploader
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            isDisabled={isLoading}
            className="mb-4"
          />

          <ProgressBar isActive={isLoading} className="mb-4" />

          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isLoading}
            className="w-full bg-[#7F77DD] hover:bg-[#6B63C8] text-white gap-2 transition-all"
            aria-label="Ejecutar diagnóstico del pipeline"
          >
            {isLoading ? (
              <>
                <Spinner className="w-4 h-4" />
                {LOADING_MESSAGES[loadingMsgIdx]}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ejecutar diagnóstico
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4">
              <ErrorCard message={error} />
            </div>
          )}
        </div>

        {/* Metadata panel */}
        {data && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-in">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Metadatos
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Original:</span>
                <span className="ml-2 font-mono text-foreground">{data.imagen.original}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Procesada:</span>
                <span className="ml-2 font-mono text-foreground">{data.imagen.procesada}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Umbral:</span>
                <span className="ml-2 font-mono text-foreground">{data.threshold}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tiempo total:</span>
                <span className="ml-2 font-mono text-[#1D9E75]">{data.tiempos.total_ms.toFixed(0)} ms</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
              <span className="font-medium text-foreground">Diagnóstico: </span>
              <span className="text-muted-foreground">{data.diagnostico}</span>
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ver desglose de tiempos
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Detección:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.deteccion_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Espacial:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.espacial_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Pasos:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.pasos_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Espacio:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.espacio_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Decisión:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.decision_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Escenario:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.escenario_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-2 rounded bg-muted/30 col-span-2">
                  <span className="text-muted-foreground">LLM:</span>
                  <span className="ml-1 font-mono text-foreground">{data.tiempos.llm_ms.toFixed(1)} ms</span>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Right column — Pipeline steps */}
      <div className="space-y-4">
        {!data && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-muted/30">
            <Terminal className="w-12 h-12 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-muted-foreground text-center text-sm">
              Sube una imagen y presiona{' '}
              <strong className="text-foreground">Ejecutar diagnóstico</strong>{' '}
              para ver el pipeline paso a paso
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-muted/30">
            <Spinner className="w-8 h-8 text-[#7F77DD] mb-3" />
            <p className="text-foreground text-center text-sm font-medium">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
            <p className="text-muted-foreground text-center text-xs mt-1">
              Analizando todas las etapas del pipeline
            </p>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Step 1 — YOLO Detections */}
            <PipelineStep stepNumber={1} title="Detecciones YOLO" delay={0}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Total detectados: <strong className="text-foreground">{data.pasos['1_detecciones'].total}</strong>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data.pasos['1_detecciones'].clases.map((cls) => (
                      <span key={cls} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Label</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Confianza</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Bbox</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pasos['1_detecciones'].detecciones.map((det, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 text-foreground">{det.label}</td>
                          <td className="py-2">{getConfidenceBar(det.confidence)}</td>
                          <td className="py-2 font-mono text-xs text-muted-foreground">
                            [{det.bbox.x1.toFixed(0)}, {det.bbox.y1.toFixed(0)}, {det.bbox.x2.toFixed(0)}, {det.bbox.y2.toFixed(0)}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </PipelineStep>

            {/* Step 2 — Spatial Analysis */}
            <PipelineStep stepNumber={2} title="Análisis espacial" delay={50}>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Total: {data.pasos['2_analisis_espacial'].total} objetos analizados
                </p>
                {data.pasos['2_analisis_espacial'].objetos.map((obj, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/30 text-sm">
                    <span className="font-medium text-foreground">{obj.label}</span>
                    <span className="text-muted-foreground">{obj.posicion}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[#EEEDFE] text-[#7F77DD]">
                      {obj.categoria}
                    </span>
                    <span className="text-xs text-muted-foreground">zona: {obj.zona}</span>
                    <span className="text-xs text-muted-foreground">conf: {obj.confianza}</span>
                  </div>
                ))}
              </div>
            </PipelineStep>

            {/* Step 3 — Steps Estimation */}
            <PipelineStep stepNumber={3} title="Estimación de pasos" delay={100}>
              <div className="space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  {data.pasos['3_estimacion_pasos'].advertencia}
                </p>
                {data.pasos['3_estimacion_pasos'].objetos.map((obj, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30 text-sm">
                    <span className="font-medium text-foreground flex-1">{obj.label}</span>
                    <span className="text-muted-foreground">{obj.posicion}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E1F5EE] text-[#0F6E56] text-xs font-medium">
                      {obj.pasos} pasos
                    </span>
                  </div>
                ))}
              </div>
            </PipelineStep>

            {/* Step 4 — Free Space */}
            <PipelineStep stepNumber={4} title="Espacio libre" delay={150}>
              <div className="space-y-4">
                <div className="space-y-3">
                  <ZoneBar label="izquierda" percentage={data.pasos['4_espacio_libre'].zonas.left} />
                  <ZoneBar label="centro" percentage={data.pasos['4_espacio_libre'].zonas.center} />
                  <ZoneBar label="derecha" percentage={data.pasos['4_espacio_libre'].zonas.right} />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#E1F5EE] text-[#0F6E56]">
                    Mejor dirección: {data.pasos['4_espacio_libre'].mejor_direccion}
                  </span>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    data.pasos['4_espacio_libre'].situacion === 'clear' && 'bg-[#E1F5EE] text-[#0F6E56]',
                    data.pasos['4_espacio_libre'].situacion === 'front_blocked' && 'bg-[#FAEEDA] text-[#BA7517]',
                    data.pasos['4_espacio_libre'].situacion === 'blocked' && 'bg-[#FCEBEB] text-[#E24B4A]'
                  )}>
                    {data.pasos['4_espacio_libre'].situacion}
                  </span>
                </div>
              </div>
            </PipelineStep>

            {/* Step 5 — Movement Decision */}
            <PipelineStep stepNumber={5} title="Decisión de movimiento" delay={200}>
              <div className="flex items-start gap-3 p-4 rounded-lg border-l-4 border-[#1D9E75] bg-muted/30">
                {getSituationIcon(data.pasos['4_espacio_libre'].situacion)}
                <p className="text-foreground">{data.pasos['5_decision'].instruccion}</p>
              </div>
            </PipelineStep>

            {/* Step 6 — Scenario */}
            <PipelineStep stepNumber={6} title="Escenario" delay={250}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#EEEDFE] text-[#7F77DD]">
                    {data.pasos['6_escenario'].tipo}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Confianza: {data.pasos['6_escenario'].confianza}
                  </span>
                </div>
                <p className="text-sm italic text-muted-foreground">
                  {data.pasos['6_escenario'].intro}
                </p>
                {data.pasos['6_escenario'].llm_error && (
                  <div className="p-3 rounded bg-[#FAEEDA] text-[#BA7517] text-sm">
                    Error LLM: {data.pasos['6_escenario'].llm_error}
                  </div>
                )}
              </div>
            </PipelineStep>

            {/* Step 7 — LLM Description */}
            <PipelineStep stepNumber={7} title="Descripción LLM" delay={300}>
              <div className="space-y-4">
                <p className="text-foreground">{data.pasos['7_descripcion_llm'].texto}</p>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Ver prompt enviado
                  </summary>
                  <pre className="mt-2 p-3 rounded bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-64">
                    {data.pasos['7_descripcion_llm'].prompt_enviado}
                  </pre>
                </details>
                {data.pasos['7_descripcion_llm'].llm_error && (
                  <div className="p-3 rounded bg-[#FAEEDA] text-[#BA7517] text-sm">
                    Error: {data.pasos['7_descripcion_llm'].llm_error}
                  </div>
                )}
              </div>
            </PipelineStep>

            {/* Step 8 — Final Narrative */}
            <PipelineStep stepNumber={8} title="Narrativa final" delay={350} defaultOpen>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="p-3 rounded bg-muted/50">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Intro escenario
                    </span>
                    <p className="text-sm text-foreground mt-1">{data.pasos['8_narrativa_final'].intro_escenario}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Descripción entorno
                    </span>
                    <p className="text-sm text-foreground mt-1">{data.pasos['8_narrativa_final'].descripcion_entorno}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Instrucción de movimiento
                    </span>
                    <p className="text-sm text-foreground mt-1">{data.pasos['8_narrativa_final'].instruccion_movimiento}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900 dark:bg-zinc-950">
                  <p className="text-lg font-serif italic text-zinc-100 leading-relaxed">
                    {data.pasos['8_narrativa_final'].narrativa_completa}
                  </p>
                </div>
                <div className="flex justify-end">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#E1F5EE] text-[#0F6E56]">
                    Tiempo total: {data.tiempos.total_ms.toFixed(0)} ms
                  </span>
                </div>
              </div>
            </PipelineStep>
          </>
        )}
      </div>
    </div>
  )
}
