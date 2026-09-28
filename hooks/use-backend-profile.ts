'use client'

import { useHealth } from '@/hooks/use-health'
import { useResearcherKeyVersion } from '@/hooks/use-researcher-key'

/**
 * Perfil del backend (APP_PROFILE), leído de GET /api/health. Es la única fuente
 * de verdad sobre qué endpoints existen (app/main.py del backend):
 *   development        → todos, incluidos los internos (debug-detect, dataset,
 *                        finetune, test); las rutas del investigador solo exigen
 *                        clave si el servidor tiene API_KEYS.
 *   study / production → sin endpoints internos; las rutas del investigador
 *                        exigen SIEMPRE X-API-Key.
 * Un backend anterior a los perfiles no envía "perfil" y montaba todos los
 * endpoints, así que se trata como development.
 */
export type BackendProfile = 'development' | 'study' | 'production'

export function useBackendProfile(baseUrl: string) {
  const { data, isLoading, error, refresh } = useHealth({ baseUrl })
  const profile: BackendProfile | null = data ? (data.perfil ?? 'development') : null
  return { profile, isLoading, error, refresh }
}

/**
 * Disponibilidad de los endpoints internos (solo development). Mientras no se
 * conoce el perfil no se llaman: 'checking' (consultando /api/health) o
 * 'unknown' (/api/health falló).
 */
export type DevEndpointsState = 'checking' | 'available' | 'unavailable' | 'unknown'

export function useDevEndpoints(baseUrl: string) {
  const { profile, isLoading, refresh } = useBackendProfile(baseUrl)
  const state: DevEndpointsState = profile
    ? profile === 'development' ? 'available' : 'unavailable'
    : isLoading ? 'checking' : 'unknown'
  return { state, profile, refresh }
}

/**
 * Acceso a las rutas del investigador (/api/study/*, /api/catalog, /api/metrics/*).
 *   canQuery : hay clave, o el backend es development (puede no exigirla). En
 *              study/production sin clave NO se consulta: el 401 sería seguro.
 *   needsKey : se sabe que hace falta una clave y todavía no hay ninguna.
 *   version  : cambia al guardar o borrar la clave; va en la clave de SWR para
 *              volver a consultar (y descartar un 401 previo) sin recargar.
 * Nunca expone la clave: solo si hay una configurada.
 */
export function useResearcherAccess(baseUrl: string) {
  const { version, hasKey } = useResearcherKeyVersion()
  const { profile, isLoading } = useBackendProfile(baseUrl)
  const canQuery = hasKey || profile === 'development'
  return {
    version,
    hasKey,
    canQuery,
    needsKey: !canQuery && !isLoading,
  }
}
