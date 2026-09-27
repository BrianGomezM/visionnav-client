/**
 * Acceso centralizado a la API del backend.
 *
 * `apiFetch` es un `fetch` que añade el header `X-API-Key` con la clave del
 * investigador cuando hay una configurada. La clave:
 *   - la introduce el investigador en tiempo de ejecución (panel de ajustes);
 *   - se guarda solo en sessionStorage (se borra al cerrar la pestaña);
 *   - NUNCA se define en variables NEXT_PUBLIC_* ni se incluye en el bundle.
 *
 * Si el backend corre sin API_KEYS (modo desarrollo), no hace falta clave.
 */

const KEY_STORAGE = 'visionnav-researcher-key'

export function getResearcherKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(KEY_STORAGE)
  } catch {
    return null
  }
}

export function setResearcherKey(key: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (key && key.trim()) window.sessionStorage.setItem(KEY_STORAGE, key.trim())
    else window.sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // sessionStorage no disponible: la app sigue funcionando sin clave
  }
}

export interface ApiFetchInit extends RequestInit {
  /** Tiempo máximo de espera (ms). Al vencer, la solicitud se aborta (ApiTimeoutError). */
  timeoutMs?: number
}

export class ApiTimeoutError extends Error {
  constructor(ms: number) {
    super(`El servidor no respondió en ${Math.round(ms / 1000)} s. Inténtelo de nuevo más tarde.`)
  }
}

export async function apiFetch(input: string, init: ApiFetchInit = {}): Promise<Response> {
  const { timeoutMs, ...rest } = init
  const headers = new Headers(rest.headers)
  const key = getResearcherKey()
  if (key) headers.set('X-API-Key', key)
  if (!timeoutMs) return fetch(input, { ...rest, headers })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, headers, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) throw new ApiTimeoutError(timeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
