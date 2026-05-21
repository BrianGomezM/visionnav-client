'use client'

import { RefreshCw, Cpu, MessageSquare, Volume2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { useHealth } from '@/hooks/use-health'
import { cn } from '@/lib/utils'

interface HealthTabProps {
  baseUrl: string
  isActive: boolean
}

export function HealthTab({ baseUrl, isActive }: HealthTabProps) {
  const { data, isLoading, isRefreshing, error, refresh } = useHealth({ 
    baseUrl, 
    enabled: isActive 
  })

  const showSpinner = isLoading || isRefreshing

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Error */}
      {error && <ErrorCard message={error} />}

      {/* Loading state - only show when no data yet */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-[#1D9E75] mb-3" />
          <p className="text-muted-foreground">Conectando con la API...</p>
        </div>
      )}

      {/* Main content */}
      {data && (
        <>
          {/* Status hero */}
          <div className="flex flex-col items-center text-center p-8 rounded-xl border border-border bg-card shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-4 w-4">
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full rounded-full opacity-75',
                    data.status === 'healthy' 
                      ? 'animate-pulse-dot bg-[#1D9E75]'
                      : 'bg-[#E24B4A]'
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex rounded-full h-4 w-4',
                    data.status === 'healthy' ? 'bg-[#1D9E75]' : 'bg-[#E24B4A]'
                  )}
                />
              </span>
              <h2 className="text-2xl font-semibold text-foreground">
                {data.status === 'healthy' ? 'Servicio activo' : 'Servicio inactivo'}
              </h2>
            </div>
            
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
              v{data.version}
            </span>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={showSpinner}
              className="mt-4 gap-2"
              aria-label="Actualizar estado del servicio"
            >
              <RefreshCw className={cn('w-4 h-4', showSpinner && 'animate-spin')} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>

          {/* Info cards grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Detection model */}
            <div className="rounded-xl border border-border bg-card p-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#E1F5EE]">
                  <Cpu className="w-5 h-5 text-[#1D9E75]" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-foreground">Modelo de deteccion</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#1D9E75]">{data.modelo.nombre}</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Pesos: <span className="text-foreground">{data.modelo.weights}</span></p>
                  <p>Img size: <span className="text-foreground">{data.modelo.imgsz}px</span></p>
                  <p>IoU: <span className="text-foreground">{data.modelo.iou}</span></p>
                </div>
              </div>
            </div>

            {/* LLM model */}
            <div className="rounded-xl border border-border bg-card p-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#EEEDFE]">
                  <MessageSquare className="w-5 h-5 text-[#7F77DD]" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-foreground">Modelo de lenguaje</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#7F77DD]">{data.llm.proveedor}</p>
                <p className="text-muted-foreground truncate" title={data.llm.modelo}>
                  {data.llm.modelo}
                </p>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  data.llm.activo
                    ? 'bg-[#E1F5EE] text-[#0F6E56]'
                    : 'bg-[#FCEBEB] text-[#E24B4A]'
                )}>
                  {data.llm.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {/* TTS */}
            <div className="rounded-xl border border-border bg-card p-5 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FAEEDA]">
                  <Volume2 className="w-5 h-5 text-[#BA7517]" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-foreground">Sintesis de voz</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#BA7517]">{data.tts.proveedor}</p>
                <p className="text-muted-foreground">{data.tts.voz}</p>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  data.tts.activo
                    ? 'bg-[#E1F5EE] text-[#0F6E56]'
                    : 'bg-[#FAEEDA] text-[#BA7517]'
                )}>
                  {data.tts.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration row */}
          <div className="flex flex-wrap gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">Umbral por defecto:</span>
              <span className="text-sm font-medium text-foreground">{data.configuracion.umbral_default}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Max. imagen:</span>
              <span className="text-sm font-medium text-foreground">{data.configuracion.max_imagen_px} px</span>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
              Ver respuesta JSON completa
            </summary>
            <pre className="px-5 pb-5 text-xs font-mono overflow-x-auto text-muted-foreground">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
