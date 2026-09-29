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

/**
 * Grabadora compacta de la barra fija de cada prueba: se pulsa al hacer la pregunta
 * (marca el inicio de la respuesta), admite pausa y se sube al guardar la respuesta.
 */
export function ResponseRecorder({
  onStart,
  onChange,
}: {
  onStart: () => void
  onChange: (blob: Blob | null) => void
}) {
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const acc = useRef(0)
  const since = useRef(0)
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle')
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
    if (state !== 'recording') return
    const id = setInterval(() => setElapsed((acc.current + performance.now() - since.current) / 1000), 500)
    return () => clearInterval(id)
  }, [state])

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
      acc.current = 0
      since.current = performance.now()
      setElapsed(0)
      rec.start()
      recRef.current = rec
      setState('recording')
      onStart()
    } catch {
      setError('No se obtuvo permiso para usar el micrófono.')
    }
  }
  const pause = () => {
    recRef.current?.pause()
    acc.current += performance.now() - since.current
    setState('paused')
  }
  const resume = () => {
    recRef.current?.resume()
    since.current = performance.now()
    setState('recording')
  }
  const stop = () => {
    if (state === 'recording') acc.current += performance.now() - since.current
    setElapsed(acc.current / 1000)
    recRef.current?.stop()
    setState('done')
  }
  const discard = () => {
    setUrl(null)
    setElapsed(0)
    setState('idle')
    onChange(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === 'idle' && (
        <Button type="button" size="sm" onClick={start} className="gap-2 bg-[#B42318] hover:bg-[#912018] text-white">
          <Mic className="w-4 h-4" aria-hidden="true" /> Grabar respuesta
        </Button>
      )}
      {(state === 'recording' || state === 'paused') && (
        <>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B42318]">
            <span className={`w-2.5 h-2.5 rounded-full bg-[#B42318] ${state === 'recording' ? 'animate-pulse' : 'opacity-40'}`} aria-hidden="true" />
            {state === 'recording' ? 'Grabando' : 'En pausa'} {fmt(elapsed)}
          </span>
          {state === 'recording' ? (
            <Button type="button" size="sm" variant="outline" onClick={pause}>
              Pausar
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={resume}>
              Reanudar
            </Button>
          )}
          <Button type="button" size="sm" variant="destructive" onClick={stop} className="gap-1">
            <Square className="w-3.5 h-3.5" aria-hidden="true" /> Detener
          </Button>
        </>
      )}
      {state === 'done' && url && (
        <>
          <audio controls src={url} aria-label="Grabación de la respuesta" className="h-8 max-w-56" />
          <span className="text-xs text-muted-foreground">{fmt(elapsed)} · se sube al guardar</span>
          <Button type="button" size="sm" variant="ghost" onClick={discard} className="gap-1">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Descartar
          </Button>
        </>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'recording' ? 'Grabando la respuesta' : state === 'paused' ? 'Grabación en pausa' : state === 'done' ? 'Grabación lista' : ''}
      </span>
      {error && (
        <span role="alert" className="text-xs text-[#B42318]">
          {error}
        </span>
      )}
    </div>
  )
}
