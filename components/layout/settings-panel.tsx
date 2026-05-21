'use client'

import { RotateCcw, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  isOpen: boolean
  baseUrl: string
  confidenceThreshold: number
  isEnvUrl?: boolean
  onBaseUrlChange: (url: string) => void
  onThresholdChange: (threshold: number) => void
  onReset: () => void
}

export function SettingsPanel({
  isOpen,
  baseUrl,
  confidenceThreshold,
  isEnvUrl = false,
  onBaseUrlChange,
  onThresholdChange,
  onReset,
}: SettingsPanelProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out bg-muted/50 border-b border-border',
        isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* API Base URL */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="base-url" className="text-sm font-medium flex items-center gap-2">
              URL base de la API
              {isEnvUrl && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#E1F5EE] text-[#0F6E56]">
                  <Lock className="w-3 h-3" />
                  Env
                </span>
              )}
            </Label>
            <Input
              id="base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://127.0.0.1:8000"
              className="bg-card"
              disabled={isEnvUrl}
              title={isEnvUrl ? 'URL configurada via NEXT_PUBLIC_API_URL' : undefined}
            />
            {isEnvUrl && (
              <p className="text-xs text-muted-foreground">
                Configurado via variable de entorno NEXT_PUBLIC_API_URL
              </p>
            )}
          </div>

          {/* Confidence threshold */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="threshold" className="text-sm font-medium">
                Umbral de confianza
              </Label>
              <span className="text-sm font-mono text-[#1D9E75] font-medium">
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
              <span>0.10</span>
              <span>0.90</span>
            </div>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
              aria-label="Restablecer configuracion por defecto"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
