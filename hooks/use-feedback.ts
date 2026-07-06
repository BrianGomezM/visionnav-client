'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

// ─────────────────────────────────────────────
// TIPOS — /api/feedback
// ─────────────────────────────────────────────
export interface FeedbackRecord {
  timestamp: string
  calificacion: number
  narrativa_evaluada: string | null
  comentario: string | null
  sesion_id: string | null
  escenario: string | null
}

export interface FeedbackStats {
  total: number
  estadisticas: {
    promedio: number
    minimo: number
    maximo: number
    distribucion: Record<string, number>
  } | null
  registros: FeedbackRecord[]
}

export interface FeedbackPayload {
  calificacion: number
  narrativa_evaluada?: string
  comentario?: string
  sesion_id?: string
  escenario?: string
}

// ─────────────────────────────────────────────
// FETCHER GENÉRICO
// ─────────────────────────────────────────────
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

// ─────────────────────────────────────────────
// HOOK — Obtener todos los feedbacks
// ─────────────────────────────────────────────
export function useFeedbackList(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<FeedbackStats>(
    enabled ? `${baseUrl}/api/feedback` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: () => mutate(),
  }
}

// ─────────────────────────────────────────────
// HOOK — Enviar feedback
// ─────────────────────────────────────────────
export function useSubmitFeedback(baseUrl: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = useCallback(
    async (payload: FeedbackPayload) => {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const res = await fetch(`${baseUrl}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`)
        }
        setSuccess(true)
        return data
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes('fetch') || err.message.includes('Failed')
              ? 'No se pudo conectar con la API. Verifica que el servidor esté corriendo.'
              : err.message
            : 'Error desconocido'
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl]
  )

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
  }, [])

  return { isLoading, error, success, submit, reset }
}
