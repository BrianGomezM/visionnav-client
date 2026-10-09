'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { downloadSessionEvidence, friendlyError } from '@/hooks/use-study'

/**
 * Descarga la evidencia de una sesión en un .zip: Excel (sesión, respuestas, codificación y
 * resumen por prueba), registro original y todos los audios, en una carpeta por participante.
 */
export function DownloadEvidenceButton({
  baseUrl,
  sessionId,
  codigo,
  compact = false,
}: {
  baseUrl: string
  sessionId: string
  codigo: string
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={loading}
        aria-label={compact ? `Descargar la evidencia de ${codigo} (.zip)` : undefined}
        onClick={async () => {
          setLoading(true)
          setError(null)
          try {
            await downloadSessionEvidence(baseUrl, sessionId, codigo)
          } catch (e) {
            setError(friendlyError(e))
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" aria-hidden="true" />}
        {compact ? 'Evidencia' : 'Descargar evidencia (.zip)'}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-[#B42318]">
          {error}
        </span>
      )}
    </span>
  )
}
