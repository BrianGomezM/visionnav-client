'use client'

import { useState, useEffect } from 'react'

export interface TtsModelOption {
  id: string
  label: string
  descripcion: string
}

interface TtsModelsResponse {
  default: string
  modelos: TtsModelOption[]
}

/** Modelos Gemini TTS disponibles (GET /api/tts/models) — cada uno tiene su propia cuota RPM. */
export function useTtsModels(baseUrl: string) {
  const [models, setModels] = useState<TtsModelOption[]>([])
  const [defaultModel, setDefaultModel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${baseUrl}/api/tts/models`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: TtsModelsResponse) => {
        if (cancelled) return
        setModels(data.modelos ?? [])
        setDefaultModel(data.default ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setModels([])
          setDefaultModel(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [baseUrl])

  return { models, defaultModel }
}
