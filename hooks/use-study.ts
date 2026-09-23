'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

// ─────────────────────────────────────────────
// TIPOS — /api/study/sessions
// ─────────────────────────────────────────────

export type TipoParticipante = 'objetivo' | 'piloto'

export interface Participant {
  session_id: string
  creado: string
  nombre: string
  tipo_participante: TipoParticipante
  edad: number | null
  genero: string | null
  consentimiento: boolean
  autoriza_grabacion_audio: boolean | null
  investigador: string | null
  notas: string | null
}

export interface SessionListItem extends Participant {
  num_respuestas: number
}

export interface StudyResponse {
  timestamp: string
  prueba_id: string
  prueba_nombre: string | null
  pregunta: string | null
  respuesta: string | null
  correcto: boolean | null
  escala: Record<string, number> | null
  tiempo_respuesta_ms: number | null
  repeticiones_audio: number | null
  solicitudes_aclaracion: number | null
  observaciones: string | null
  imagen_usada: string | null
}

export interface SessionCreatePayload {
  nombre: string
  tipo_participante: TipoParticipante
  edad?: number
  genero?: string
  consentimiento: boolean
  autoriza_grabacion_audio?: boolean
  investigador?: string
  notas?: string
}

export interface ResponsePayload {
  prueba_id: string
  prueba_nombre?: string
  pregunta?: string
  respuesta?: string
  correcto?: boolean
  escala?: Record<string, number>
  tiempo_respuesta_ms?: number
  repeticiones_audio?: number
  solicitudes_aclaracion?: number
  observaciones?: string
  imagen_usada?: string
}

// ─────────────────────────────────────────────
// FETCHER GENÉRICO
// ─────────────────────────────────────────────
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

function friendlyError(err: unknown): string {
  return err instanceof Error
    ? err.message.includes('fetch') || err.message.includes('Failed')
      ? 'No se pudo conectar con la API. Verifica que el servidor esté corriendo.'
      : err.message
    : 'Error desconocido'
}

// ─────────────────────────────────────────────
// HOOK — Listar sesiones
// ─────────────────────────────────────────────
export function useStudySessions(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<{ total: number; sesiones: SessionListItem[] }>(
    enabled ? `${baseUrl}/api/study/sessions` : null,
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
// HOOK — Detalle de una sesión (participante + respuestas)
// ─────────────────────────────────────────────
export function useStudySessionDetail(baseUrl: string, sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ participant: Participant; respuestas: StudyResponse[] }>(
    sessionId ? `${baseUrl}/api/study/sessions/${sessionId}` : null,
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
// HOOK — Crear sesión
// ─────────────────────────────────────────────
export function useCreateSession(baseUrl: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (payload: SessionCreatePayload) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${baseUrl}/api/study/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
        return data as { status: string; session_id: string; participant: Participant }
      } catch (err) {
        setError(friendlyError(err))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl]
  )

  return { isLoading, error, create }
}

// ─────────────────────────────────────────────
// HOOK — Registrar una respuesta dentro de una sesión
// ─────────────────────────────────────────────
export function useAddResponse(baseUrl: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addResponse = useCallback(
    async (sessionId: string, payload: ResponsePayload) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${baseUrl}/api/study/sessions/${sessionId}/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
        return data as { status: string; respuesta: StudyResponse }
      } catch (err) {
        setError(friendlyError(err))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl]
  )

  return { isLoading, error, addResponse }
}

// ─────────────────────────────────────────────
// HOOK — Eliminar sesión
// ─────────────────────────────────────────────
export function useDeleteSession(baseUrl: string) {
  const [isLoading, setIsLoading] = useState(false)

  const remove = useCallback(
    async (sessionId: string) => {
      setIsLoading(true)
      try {
        const res = await fetch(`${baseUrl}/api/study/sessions/${sessionId}`, { method: 'DELETE' })
        return res.ok
      } catch {
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl]
  )

  return { isLoading, remove }
}
