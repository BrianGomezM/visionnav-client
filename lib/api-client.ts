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

export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const key = getResearcherKey()
  if (!key) return fetch(input, init)
  const headers = new Headers(init.headers)
  headers.set('X-API-Key', key)
  return fetch(input, { ...init, headers })
}
