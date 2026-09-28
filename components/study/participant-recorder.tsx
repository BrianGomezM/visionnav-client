'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Grabación de la respuesta verbal del participante (respuesta_participante.*).
 * Solo se muestra si la sesión registra la autorización de grabación; el servidor
 * vuelve a comprobarla y exige almacenamiento fuera del repositorio. Es un
 * archivo DISTINTO del audio de la narrativa generado por la API.
 */
export function ParticipantRecorder({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    recRef.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const start = async () => {
    setError(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite grabar audio.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        setUrl(URL.createObjectURL(blob))
        onChange(blob)
      }
      rec.start()
      recRef.current = rec
      setRecording(true)
    } catch {
      setError('No se obtuvo permiso para usar el micrófono.')
    }
  }

  const stop = () => {
    recRef.current?.stop()
    setRecording(false)
  }

  const discard = () => {
    setUrl(null)
    onChange(null)
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">Grabación de la respuesta del participante (autorizada)</p>
      <div className="flex flex-wrap gap-2 items-center">
        {!recording ? (
          <Button type="button" variant="outline" onClick={start} disabled={Boolean(url)} className="gap-2">
            <Mic className="w-4 h-4" aria-hidden="true" /> Grabar respuesta
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stop} className="gap-2">
            <Square className="w-4 h-4" aria-hidden="true" /> Detener grabación
          </Button>
        )}
        {url && (
          <>
            <audio controls src={url} aria-label="Grabación del participante" className="h-9" />
            <Button type="button" variant="ghost" onClick={discard} className="gap-2">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Descartar
            </Button>
          </>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {recording ? 'Grabando…' : url ? 'Grabación lista: se sube al guardar la respuesta.' : ''}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  )
}
