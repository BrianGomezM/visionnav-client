import { Clock, Layers, Box, ImageIcon, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SceneMetricsProps {
  escenario: {
    tipo: string
    confianza: 'alta' | 'media' | 'baja'
    intro: string
  }
  metricas: {
    deteccion_ms: number
    total_ms: number
    objetos_detectados: number
    umbral_confianza: number
    imagen: {
      original: string
      procesada: string
    }
    tts_ms?: number
    llm_ms: number
  }
}

export function SceneMetrics({ escenario, metricas }: SceneMetricsProps) {
  const confidenceColors = {
    alta: 'bg-[#E1F5EE] text-[#0F6E56]',
    media: 'bg-[#FAEEDA] text-[#BA7517]',
    baja: 'bg-[#FCEBEB] text-[#E24B4A]',
  }

  const confidenceLabels = {
    alta: 'Alta confianza',
    media: 'Confianza media',
    baja: 'Baja confianza',
  }

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 animate-fade-in-up"
      style={{ animationDelay: '160ms' }}
    >
      {/* Scene info row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#EEEDFE] text-[#7F77DD]">
          {escenario.tipo}
        </span>
        <span className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
          confidenceColors[escenario.confianza]
        )}>
          {confidenceLabels[escenario.confianza]}
        </span>
      </div>

      {/* Intro text */}
      <p className="text-sm italic text-muted-foreground mb-5">
        {escenario.intro}
      </p>

      {/* Metrics tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-muted-foreground mb-1" aria-hidden="true" />
          <span className="text-lg font-semibold text-foreground">
            {metricas.deteccion_ms.toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground">ms deteccion</span>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
          <Layers className="w-4 h-4 text-muted-foreground mb-1" aria-hidden="true" />
          <span className="text-lg font-semibold text-foreground">
            {metricas.total_ms.toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground">ms total</span>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
          <Box className="w-4 h-4 text-muted-foreground mb-1" aria-hidden="true" />
          <span className="text-lg font-semibold text-foreground">
            {metricas.objetos_detectados}
          </span>
          <span className="text-xs text-muted-foreground">objetos</span>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
          <Gauge className="w-4 h-4 text-muted-foreground mb-1" aria-hidden="true" />
          <span className="text-lg font-semibold text-foreground">
            {metricas.umbral_confianza}
          </span>
          <span className="text-xs text-muted-foreground">umbral</span>
        </div>
      </div>

      {/* Image info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" aria-hidden="true" />
          <span>Original: <span className="font-mono text-foreground">{metricas.imagen.original}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Procesada: <span className="font-mono text-foreground">{metricas.imagen.procesada}</span></span>
        </div>
      </div>

      {/* Additional timing info */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <span>LLM: <span className="font-mono text-foreground">{metricas.llm_ms.toFixed(0)} ms</span></span>
        {metricas.tts_ms !== undefined && (
          <span>TTS: <span className="font-mono text-foreground">{metricas.tts_ms.toFixed(0)} ms</span></span>
        )}
      </div>
    </div>
  )
}
