'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'
import { ApiRequestError, parseApiError } from '@/lib/api-errors'
import { useResearcherAccess } from '@/hooks/use-backend-profile'
import type {
  ResponsePayload,
  Sesion,
  SessionCreatePayload,
  SessionListItem,
  SessionSummary,
  StudyResponseRecord,
} from '@/lib/study-protocol'

/**
 * Acceso a /api/study/* (contrato v2, backend app/routes/study.py).
 * Todas las llamadas llevan X-API-Key (apiFetch) y las consultas se revalidan
 * cuando el investigador guarda la clave. En study/production no se consulta
 * hasta que hay clave (useResearcherAccess): se evita un 401 seguro.
 */

export interface SessionDetail {
  sesion: Sesion
  respuestas: StudyResponseRecord[]
  resumen: SessionSummary
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return res.json() as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetcher = async ([url]: readonly [string, number]): Promise<any> => jsonOrThrow(await apiFetch(url))

export function friendlyError(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message
  if (err instanceof Error)
    return err.message.includes('fetch') || err.message.includes('Failed')
      ? 'No se pudo conectar con la API. Verifique que el servidor esté disponible.'
      : err.message
  return 'Error desconocido'
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiRequestError && err.info.status === 401
}

export function useStudySessions(baseUrl: string, enabled = true) {
  const { version, canQuery, needsKey } = useResearcherAccess(baseUrl)
  const { data, error, isLoading, mutate } = useSWR<{
    total: number
    sesiones: SessionListItem[]
    sesiones_heredadas_omitidas: number
  }>(enabled && canQuery ? [`${baseUrl}/api/study/sessions`, version] : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return {
    data: data ?? null,
    isLoading,
    error: error ? friendlyError(error) : null,
    unauthorized: isUnauthorized(error),
    needsKey,
    refresh: () => mutate(),
  }
}

export function useStudySessionDetail(baseUrl: string, sessionId: string | null) {
  const { version, canQuery } = useResearcherAccess(baseUrl)
  const { data, error, isLoading, mutate } = useSWR<SessionDetail>(
    sessionId && canQuery ? [`${baseUrl}/api/study/sessions/${encodeURIComponent(sessionId)}`, version] : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  return {
    data: data ?? null,
    isLoading,
    error: error ? friendlyError(error) : null,
    refresh: () => mutate(),
  }
}

/** Ejecuta una operación con estado de carga y mensaje de error legible. */
function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (...args: A): Promise<R | null> => {
      setIsLoading(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (err) {
        setError(friendlyError(err))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [fn]
  )
  return { isLoading, error, run, clearError: () => setError(null) }
}

const postJson = (url: string, body: unknown) =>
  apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function useStudyActions(baseUrl: string) {
  const base = `${baseUrl}/api/study/sessions`

  const create = useAction(
    useCallback(
      async (payload: SessionCreatePayload) =>
        jsonOrThrow<{ status: string; session_id: string; sesion: Sesion }>(await postJson(base, payload)),
      [base]
    )
  )

  const addResponse = useAction(
    useCallback(
      async (sessionId: string, payload: ResponsePayload) =>
        jsonOrThrow<{ status: string; respuesta: StudyResponseRecord }>(
          await postJson(`${base}/${encodeURIComponent(sessionId)}/responses`, payload)
        ),
      [base]
    )
  )

  const uploadRecording = useAction(
    useCallback(
      async (sessionId: string, responseId: string, blob: Blob) => {
        const form = new FormData()
        const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm'
        form.append('file', new File([blob], `respuesta_participante.${ext}`, { type: blob.type.split(';')[0] }))
        return jsonOrThrow<{ status: string }>(
          await apiFetch(`${base}/${encodeURIComponent(sessionId)}/responses/${responseId}/grabacion`, {
            method: 'POST',
            body: form,
          })
        )
      },
      [base]
    )
  )

  const close = useAction(
    useCallback(
      async (sessionId: string, payload: unknown) =>
        jsonOrThrow<{ status: string; sesion: Sesion }>(
          await postJson(`${base}/${encodeURIComponent(sessionId)}/cierre`, payload)
        ),
      [base]
    )
  )

  const remove = useAction(
    useCallback(
      async (sessionId: string) =>
        jsonOrThrow<{ status: string }>(
          await apiFetch(`${base}/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
        ),
      [base]
    )
  )

  return { create, addResponse, uploadRecording, close, remove }
}

/** Imagen de un estímulo del catálogo (requiere X-API-Key, por eso no se usa <img src> directo). */
export async function fetchStimulusImage(baseUrl: string, imagenUrl: string): Promise<File> {
  const res = await apiFetch(`${baseUrl}${imagenUrl}`)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  const blob = await res.blob()
  const name = imagenUrl.split('/').slice(-2, -1)[0] ?? 'estimulo'
  return new File([blob], `${name}.png`, { type: blob.type || 'image/png' })
}

/** Audio congelado de un estímulo, en base64, verificado contra su sha256 antes de usarlo. */
export async function fetchFrozenAudio(baseUrl: string, audioUrl: string, sha256: string): Promise<string> {
  const res = await apiFetch(`${baseUrl}${audioUrl}`)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  const bytes = new Uint8Array(await res.arrayBuffer())
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  if (digest !== sha256) throw new Error('El audio recibido no coincide con el congelado (sha256). No lo reproduzca.')
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/** Grabación de la lectura del consentimiento (sesiones v3 con almacenamiento en el servidor). */
export async function fetchConsentAudio(baseUrl: string, sessionId: string): Promise<string> {
  const res = await apiFetch(`${baseUrl}/api/study/sessions/${encodeURIComponent(sessionId)}/consentimiento/audio`)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return URL.createObjectURL(await res.blob())
}

/** Audio guardado de una respuesta (para escucharlo al revisar resultados). */
export async function fetchStoredAudio(
  baseUrl: string,
  sessionId: string,
  responseId: string,
  tipo: 'narrativa' | 'participante'
): Promise<string> {
  const res = await apiFetch(
    `${baseUrl}/api/study/sessions/${encodeURIComponent(sessionId)}/responses/${responseId}/audio/${tipo}`
  )
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return URL.createObjectURL(await res.blob())
}
