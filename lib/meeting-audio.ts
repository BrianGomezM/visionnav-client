/**
 * Audio de la reunión (Google Meet u otra) para las grabaciones del estudio.
 *
 * El investigador comparte UNA vez la pestaña de la reunión con su audio
 * (getDisplayMedia). Mientras siga compartida, cada grabación mezcla el micrófono
 * local con ese audio, de modo que queden todas las voces: la del investigador
 * (micrófono) y la de los participantes remotos (audio de la pestaña). La pestaña
 * de Meet no incluye la voz local, así que no se duplica.
 *
 * Solo Chrome y Edge de escritorio permiten capturar el audio de una pestaña.
 */
import { useSyncExternalStore } from 'react'

type State = { stream: MediaStream | null; label: string | null }

let state: State = { stream: null, label: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const setState = (s: State) => {
  state = s
  emit()
}

export function meetingAudioSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)
}

export function getMeetingStream(): MediaStream | null {
  const s = state.stream
  return s && s.getAudioTracks().some((t) => t.readyState === 'live') ? s : null
}

export async function connectMeetingAudio(): Promise<void> {
  if (!meetingAudioSupported()) throw new Error('Este navegador no permite capturar el audio de otra pestaña. Use Chrome o Edge.')
  disconnectMeetingAudio()
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      // Chrome exige pedir video para ofrecer el audio de la pestaña.
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      // Opciones de Chrome: ofrecer pestañas primero y no la propia pestaña de VisionNav.
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      systemAudio: 'include',
    } as DisplayMediaStreamOptions)
  } catch {
    throw new Error('No se compartió ninguna pestaña.')
  }
  const audio = stream.getAudioTracks()
  if (audio.length === 0) {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('La pestaña se compartió sin audio. Vuelva a intentarlo y active «Compartir también el audio de la pestaña».')
  }
  // El video no se usa: se deshabilita para no procesarlo, sin detenerlo (detenerlo puede cortar la captura).
  stream.getVideoTracks().forEach((t) => (t.enabled = false))
  const end = () => {
    if (state.stream === stream) {
      stream.getTracks().forEach((t) => t.stop())
      setState({ stream: null, label: null })
    }
  }
  stream.getTracks().forEach((t) => t.addEventListener('ended', end))
  setState({ stream, label: stream.getVideoTracks()[0]?.label || audio[0].label || 'pestaña compartida' })
}

export function disconnectMeetingAudio(): void {
  state.stream?.getTracks().forEach((t) => t.stop())
  setState({ stream: null, label: null })
}

export function useMeetingAudio(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state
  )
}

/**
 * Stream para MediaRecorder: micrófono + audio de la reunión si está conectado.
 * `release` libera el micrófono y la mezcla, pero NO la captura de la reunión,
 * que se reutiliza en las grabaciones siguientes.
 */
export async function openRecordingStream(): Promise<{ stream: MediaStream; release: () => void; mixed: boolean }> {
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const meeting = getMeetingStream()
  if (!meeting) return { stream: mic, release: () => mic.getTracks().forEach((t) => t.stop()), mixed: false }

  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()
  ctx.createMediaStreamSource(mic).connect(dest)
  ctx.createMediaStreamSource(new MediaStream(meeting.getAudioTracks())).connect(dest)
  if (ctx.state === 'suspended') await ctx.resume()
  return {
    stream: dest.stream,
    release: () => {
      mic.getTracks().forEach((t) => t.stop())
      void ctx.close()
    },
    mixed: true,
  }
}
