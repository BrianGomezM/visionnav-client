'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { primaryButtonClass } from '@/components/study/form-controls'
import type { PlayEvent } from '@/lib/study-protocol'

/**
 * Reproductor del audio TTS generado por la API (el estímulo evaluado).
 *
 * - "Reproducir" registra la reproducción INICIAL; cada "Repetir" registra una
 *   repetición solicitada por el participante, con su instante.
 * - "Pausar"/"Reanudar" continúan la misma reproducción: no cuentan como repetición.
 * - No usa la voz del navegador: sin audio del sistema no hay estímulo.
 * - Informa el fin de cada reproducción (para el tiempo de respuesta, métrica débil).
 */
export function StudyAudioPlayer({
  audioBase64,
  contentType,
  plays,
  onPlay,
  onEnded,
  disabled,
}: {
  audioBase64: string
  contentType: string
  plays: PlayEvent[]
  onPlay: (e: PlayEvent) => void
  onEnded: (at: number) => void
  disabled?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const a = new Audio(`data:${contentType};base64,${audioBase64}`)
    a.onended = () => {
      setPlaying(false)
      setPaused(false)
      setStatus('Reproducción terminada.')
      onEnded(performance.now())
    }
    a.onerror = () => {
      setPlaying(false)
      setError('El navegador no pudo reproducir el audio.')
    }
    audioRef.current = a
    return () => {
      a.pause()
      audioRef.current = null
    }
    // onEnded se lee en el momento del evento: basta con recrear al cambiar el audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBase64, contentType])

  const start = async (tipo: PlayEvent['tipo']) => {
    const a = audioRef.current
    if (!a) return
    setError(null)
    a.currentTime = 0
    try {
      await a.play()
      setPlaying(true)
      setPaused(false)
      onPlay({ instante: new Date().toISOString(), tipo })
      setStatus(tipo === 'inicial' ? 'Reproduciendo el audio…' : 'Repitiendo el audio…')
    } catch {
      setError('No se pudo iniciar la reproducción (el navegador la bloqueó). Inténtelo de nuevo.')
    }
  }

  const pause = () => {
    audioRef.current?.pause()
    setPlaying(false)
    setPaused(true)
    setStatus('Reproducción en pausa.')
  }

  const resume = async () => {
    const a = audioRef.current
    if (!a) return
    try {
      await a.play()
      setPlaying(true)
      setPaused(false)
      setStatus('Reproducción reanudada.')
    } catch {
      setError('No se pudo reanudar la reproducción. Inténtelo de nuevo.')
    }
  }

  const repeticiones = plays.filter((p) => p.tipo === 'repeticion').length
  const started = plays.length > 0

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Audio de la narrativa (generado por la API)</p>
      <div className="flex flex-wrap gap-2">
        {!started ? (
          <Button onClick={() => start('inicial')} disabled={disabled || playing} className={`gap-2 ${primaryButtonClass}`}>
            <Play className="w-4 h-4" aria-hidden="true" /> Reproducir audio al participante
          </Button>
        ) : (
          <Button onClick={() => start('repeticion')} disabled={disabled || playing} variant="outline" className="gap-2">
            <Repeat className="w-4 h-4" aria-hidden="true" /> Repetir (el participante lo solicitó)
          </Button>
        )}
        {playing && (
          <Button onClick={pause} variant="ghost" className="gap-2">
            <Pause className="w-4 h-4" aria-hidden="true" /> Pausar
          </Button>
        )}
        {paused && (
          <Button onClick={resume} variant="ghost" className="gap-2">
            <Play className="w-4 h-4" aria-hidden="true" /> Reanudar (misma reproducción)
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Reproducciones: {plays.length} · Repeticiones solicitadas: <strong className="text-foreground">{repeticiones}</strong>
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  )
}
