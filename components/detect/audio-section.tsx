'use client'

import { useState, useCallback, useMemo } from 'react'
import { Volume2, Play, Pause, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioSectionProps {
  audioAvailable: boolean
  audioBase64?: string
  contentType?: string
  narrative: string
}

export function AudioSection({ audioAvailable, audioBase64, contentType, narrative }: AudioSectionProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Create data URI from base64
  const audioDataUri = useMemo(() => {
    if (audioAvailable && audioBase64 && contentType) {
      return `data:${contentType};base64,${audioBase64}`
    }
    return null
  }, [audioAvailable, audioBase64, contentType])

  const handleBrowserSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      } else {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(narrative)
        utterance.lang = 'es-ES'
        utterance.rate = 0.92
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        
        setIsSpeaking(true)
        window.speechSynthesis.speak(utterance)
      }
    }
  }, [narrative, isSpeaking])

  const stopBrowserSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 animate-fade-in-up"
      style={{ animationDelay: '80ms' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-5 h-5 text-[#1D9E75]" aria-hidden="true" />
        <h3 className="font-medium text-foreground">Sintesis de voz</h3>
      </div>

      {/* Audio player (if TTS available) */}
      {audioDataUri && (
        <div className="mb-4">
          <audio
            controls
            src={audioDataUri}
            className="w-full h-10"
            aria-label="Reproduccion de audio de la narrativa"
          >
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      )}

      {/* Browser speech fallback */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBrowserSpeech}
            className="gap-2"
            aria-label={isSpeaking ? 'Pausar sintesis de voz' : 'Reproducir narrativa con sintesis de voz del navegador'}
          >
            {isSpeaking ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Reproducir con navegador
              </>
            )}
          </Button>

          {isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopBrowserSpeech}
              className="gap-2"
              aria-label="Detener sintesis de voz"
            >
              <StopCircle className="w-4 h-4" />
              Detener
            </Button>
          )}
        </div>

        {/* Status badge */}
        {audioAvailable ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#0F6E56]">
            TTS activado
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAEEDA] text-[#BA7517]">
            TTS no disponible
          </span>
        )}
      </div>
    </div>
  )
}
