'use client'

import { useMemo } from 'react'
import { RotateCcw, Lock, Settings2, Globe, Gauge, Mic2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useTtsModels } from '@/hooks/use-tts-models'

interface SettingsPanelProps {
  isOpen: boolean
  baseUrl: string
  confidenceThreshold: number
  ttsModel: string | null
  isEnvUrl?: boolean
  onBaseUrlChange: (url: string) => void
  onThresholdChange: (threshold: number) => void
  onTtsModelChange: (model: string | null) => void
  onReset: () => void
}

/** Encabezado reutilizable para cada tarjeta de ajuste. */
function SettingCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="w-4 h-4 text-[#1D9E75]" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function SettingsPanel({
  isOpen,
  baseUrl,
  confidenceThreshold,
  ttsModel,
  isEnvUrl = false,
  onBaseUrlChange,
  onThresholdChange,
  onTtsModelChange,
  onReset,
}: SettingsPanelProps) {
  const { models, defaultModel } = useTtsModels(baseUrl)

  // El modelo "por defecto" ya representa uno de los modelos de la lista —
  // se excluye de las opciones normales para no mostrarlo duplicado.
  const alternateModels = useMemo(
    () => models.filter((m) => m.id !== defaultModel),
    [models, defaultModel]
  )

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out border-b border-border bg-muted/30',
        isOpen ? 'max-h-[40rem] opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Encabezado del panel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Configuración</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-2"
            aria-label="Restablecer configuracion por defecto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* API Base URL */}
          <SettingCard icon={Globe} title="URL base de la API">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="base-url" className="sr-only">
                  URL base de la API
                </Label>
                {isEnvUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#E1F5EE] text-[#0F6E56]">
                    <Lock className="w-3 h-3" />
                    Variable de entorno
                  </span>
                )}
              </div>
              <Input
                id="base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                placeholder="http://127.0.0.1:8000"
                className="bg-background"
                disabled={isEnvUrl}
                title={isEnvUrl ? 'URL configurada via NEXT_PUBLIC_API_URL' : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {isEnvUrl
                  ? 'Configurado via NEXT_PUBLIC_API_URL — no editable aquí.'
                  : 'Dirección del servidor backend (FastAPI).'}
              </p>
            </div>
          </SettingCard>

          {/* Confidence threshold */}
          <SettingCard icon={Gauge} title="Umbral de confianza">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold" className="sr-only">
                  Umbral de confianza
                </Label>
                <span className="text-sm font-mono text-[#1D9E75] font-semibold">
                  {confidenceThreshold.toFixed(2)}
                </span>
              </div>
              <Slider
                id="threshold"
                min={0.10}
                max={0.90}
                step={0.05}
                value={[confidenceThreshold]}
                onValueChange={([value]) => onThresholdChange(value)}
                className="w-full"
                aria-label="Umbral de confianza para deteccion"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.10 · más detecciones</span>
                <span>0.90 · más estricto</span>
              </div>
            </div>
          </SettingCard>

          {/* TTS model (cada modelo tiene su propia cuota RPM en el nivel gratuito) */}
          <SettingCard icon={Mic2} title="Modelo Gemini TTS">
            <div className="space-y-1.5">
              <Label htmlFor="tts-model" className="sr-only">
                Modelo Gemini TTS
              </Label>
              <Select
                value={ttsModel ?? '__default__'}
                onValueChange={(value) => onTtsModelChange(value === '__default__' ? null : value)}
              >
                <SelectTrigger id="tts-model" className="bg-background w-full">
                  <SelectValue placeholder="Modelo por defecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    Por defecto{defaultModel ? ` (${defaultModel.replace('models/', '')})` : ''}
                  </SelectItem>
                  {alternateModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cambia si agotas las 3 solicitudes/min gratuitas — cada modelo tiene cuota propia.
              </p>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  )
}
