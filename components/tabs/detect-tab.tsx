'use client'

import { useState, useCallback, useEffect } from 'react'
import { Eye, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ImageUploader } from '@/components/shared/image-uploader'
import { ErrorCard } from '@/components/shared/error-card'
import { ProgressBar } from '@/components/shared/progress-bar'
import { NarrativeCard } from '@/components/detect/narrative-card'
import { AudioSection } from '@/components/detect/audio-section'
import { SceneMetrics } from '@/components/detect/scene-metrics'
import { useDetect } from '@/hooks/use-detect'

const LOADING_MESSAGES = [
  'Procesando imagen...',
  'Detectando objetos en la escena...',
  'Analizando espacio libre...',
  'Generando narrativa con IA...',
  'Finalizando análisis...',
]

interface DetectTabProps {
  baseUrl: string
  confidenceThreshold: number
  onHasDataChange?: (hasData: boolean) => void
}

export function DetectTab({ baseUrl, confidenceThreshold, onHasDataChange }: DetectTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const { data, isLoading, error, detect, reset } = useDetect({ baseUrl, confidenceThreshold })

  // Cycle through messages during long API calls for better perceived performance
  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIdx(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [isLoading])

  // Report state to parent so it can show a warning before tab switching
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
    await detect(selectedFile)
  }, [selectedFile, detect])

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left column — Input */}
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Analizar escena
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Sube una imagen para generar una descripción auditiva egocéntrica de la escena.
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
            className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white gap-2 transition-all"
            aria-label="Analizar imagen seleccionada"
          >
            {isLoading ? (
              <>
                <Spinner className="w-4 h-4" />
                {LOADING_MESSAGES[loadingMsgIdx]}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Analizar imagen
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4">
              <ErrorCard message={error} />
            </div>
          )}
        </div>
      </div>

      {/* Right column — Results */}
      <div className="space-y-5">
        {!data && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-muted/30">
            <Shield className="w-12 h-12 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-muted-foreground text-center text-sm">
              Sube una imagen y presiona{' '}
              <strong className="text-foreground">Analizar imagen</strong>{' '}
              para comenzar
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-muted/30">
            <Spinner className="w-8 h-8 text-[#1D9E75] mb-3" />
            <p className="text-foreground text-center text-sm font-medium">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
            <p className="text-muted-foreground text-center text-xs mt-1">
              Esto puede tomar unos segundos
            </p>
          </div>
        )}

        {data && !isLoading && (
          <>
            <NarrativeCard narrative={data.narrativa_final} />
            <AudioSection
              audioAvailable={data.audio?.disponible || false}
              audioBase64={data.audio?.data_base64}
              contentType={data.audio?.content_type}
              narrative={data.narrativa_final}
            />
            <SceneMetrics
              escenario={data.escenario}
              metricas={data.metricas}
            />
          </>
        )}
      </div>
    </div>
  )
}
