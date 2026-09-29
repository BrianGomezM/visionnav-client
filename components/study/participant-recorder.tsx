'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Grabadora de voz con el micrófono del computador (MediaRecorder). Entrega el audio
 * al detener; el componente que la usa decide cuándo subirlo al servidor.
 */
export function AudioRecorder({
  title,
  startLabel,
  readyText,
  onChange,
}: {
  title: string
  startLabel: string
  readyText: string
  onChange: (blob: Blob | null, durationS: number | null) => void
}) {
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef<number>(0)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    recRef.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 500)
    return () => clearInterval(id)
  }, [recording])

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
        const duration = (performance.now() - startedAt.current) / 1000
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        setElapsed(duration)
        setUrl(URL.createObjectURL(blob))
        onChange(blob, Math.round(duration * 10) / 10)
      }
      startedAt.current = performance.now()
      setElapsed(0)
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
    setElapsed(0)
    onChange(null, null)
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2 items-center">
        {!recording ? (
          <Button type="button" variant="outline" onClick={start} disabled={Boolean(url)} className="gap-2">
            <Mic className="w-4 h-4" aria-hidden="true" /> {startLabel}
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stop} className="gap-2">
            <Square className="w-4 h-4" aria-hidden="true" /> Detener grabación ({fmt(elapsed)})
          </Button>
        )}
        {url && (
          <>
            <audio controls src={url} aria-label={title} className="h-9" />
            <Button type="button" variant="ghost" onClick={discard} className="gap-2">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Descartar y volver a grabar
            </Button>
          </>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {recording ? 'Grabando…' : url ? `${readyText} Duración: ${fmt(elapsed)}.` : ''}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Grabación de la respuesta verbal del participante (respuesta_participante.*).
 * Solo se muestra si la sesión registra la autorización de grabación; el servidor
 * vuelve a comprobarla y exige almacenamiento fuera del repositorio. Es un
 * archivo DISTINTO del audio de la narrativa generado por la API.
 */
export function ParticipantRecorder({ onChange }: { onChange: (blob: Blob | null) => void }) {
  return (
    <AudioRecorder
      title="Grabación de la respuesta del participante (autorizada)"
      startLabel="Grabar respuesta"
      readyText="Grabación lista: se sube al guardar la respuesta."
      onChange={(blob) => onChange(blob)}
    />
  )
}
