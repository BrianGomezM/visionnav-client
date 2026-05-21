'use client'

import { useState, useCallback } from 'react'

export interface DetectResponse {
  status: 'success' | 'error'
  narrativa_final: string
  audio: {
    disponible: boolean
    archivo?: string
    content_type?: string
    data_base64?: string
    tamano_bytes?: number
  }
  escenario: {
    tipo: string
    confianza: 'alta' | 'media' | 'baja'
    intro: string
  }
  metricas: {
    deteccion_ms: number
    espacial_ms: number
    pasos_ms: number
    espacio_ms: number
    decision_ms: number
    escenario_ms: number
    llm_ms: number
    total_ms: number
    tts_ms?: number
    objetos_detectados: number
    umbral_confianza: number
    imagen: {
      original: string
      procesada: string
    }
  }
}

interface UseDetectOptions {
  baseUrl: string
  confidenceThreshold: number
}

export function useDetect({ baseUrl, confidenceThreshold }: UseDetectOptions) {
  const [data, setData] = useState<DetectResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detect = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('confidence_threshold', confidenceThreshold.toString())
      form.append('debug', 'false')

      const res = await fetch(`${baseUrl}/api/detect`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`)
      }

      const result: DetectResponse = await res.json()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error 
        ? err.message.includes('fetch') || err.message.includes('Failed')
          ? 'No se pudo conectar con la API. Verifica que el servidor este corriendo.'
          : err.message
        : 'Error desconocido'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, confidenceThreshold])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    detect,
    reset,
  }
}
