'use client'

import { useEffect, useState } from 'react'
import { Headphones, MonitorUp, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectMeetingAudio, disconnectMeetingAudio, meetingAudioSupported, useMeetingAudio } from '@/lib/meeting-audio'

/** Nivel del audio de la reunión (0–1), para comprobar que se oyen los participantes. */
function useLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0)
  const [hearing, setHearing] = useState(false)
  useEffect(() => {
    if (!stream) {
      setLevel(0)
      setHearing(false)
      return
    }
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    an.fftSize = 512
    ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(an)
    const buf = new Uint8Array(an.fftSize)
    let raf = 0
    let last = 0
    let lastVoice = -1e9
    const tick = (t: number) => {
      if (t - last > 120) {
        an.getByteTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
        const lv = Math.min(1, peak / 64)
        if (lv > 0.08) lastVoice = t
        setLevel(lv)
        setHearing(t - lastVoice < 3000)
        last = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      void ctx.close()
    }
  }, [stream])
  return { level, hearing }
}

/**
 * Conecta el audio de la pestaña de la reunión para que las grabaciones incluyan
 * las voces de los participantes remotos además del micrófono del investigador.
 */
export function MeetingAudioControl() {
  const { stream, label } = useMeetingAudio()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [supported, setSupported] = useState(true)
  const { level, hearing } = useLevel(stream)

  useEffect(() => setSupported(meetingAudioSupported()), [])

  const connect = async () => {
    setError(null)
    setBusy(true)
    try {
      await connectMeetingAudio()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar el audio de la reunión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-label="Audio de la reunión"
      className={`rounded-lg border p-3 text-sm space-y-2 ${stream ? 'border-[#067647]/40 bg-[#ECFDF3]' : 'border-[#B54708]/30 bg-[#FFFAEB]'}`}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="font-medium text-foreground flex items-center gap-2">
          <Headphones className="w-4 h-4" aria-hidden="true" />
          {stream ? 'Grabación: su micrófono + audio de la reunión' : 'Grabación: solo su micrófono'}
        </p>
        {stream ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground" title={label ?? undefined}>
              Reunión
              <span className="w-20 h-2 rounded bg-muted overflow-hidden" aria-hidden="true">
                <span className="block h-full bg-[#067647] transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
              </span>
              <span role="status" aria-live="polite">{hearing ? 'se escuchan voces' : 'sin sonido'}</span>
            </span>
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={disconnectMeetingAudio}>
              <Unplug className="w-3.5 h-3.5" aria-hidden="true" /> Desconectar
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={connect} disabled={busy || !supported}>
            <MonitorUp className="w-4 h-4" aria-hidden="true" /> Conectar audio de la reunión (Meet)
          </Button>
        )}
      </div>
      {!stream && (
        <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-0.5">
          <li>Pulse «Conectar audio de la reunión», elija la pestaña de Google Meet y active «Compartir también el audio de la pestaña».</li>
          <li>Use audífonos: así el micrófono no vuelve a captar la voz del participante.</li>
          <li>Para que el participante escuche los audios de las pruebas, en Meet use «Presentar → Una pestaña», elija esta pestaña de VisionNav y active también su audio.</li>
        </ol>
      )}
      {!supported && <p className="text-xs text-[#B42318]">Este navegador no permite capturar el audio de otra pestaña. Use Chrome o Edge en el computador.</p>}
      {error && <p role="alert" className="text-xs text-[#B42318]">{error}</p>}
    </section>
  )
}
