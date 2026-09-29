'use client'

import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'
import { ApiRequestError, parseApiError } from '@/lib/api-errors'
import { useBackendProfile, useResearcherAccess } from '@/hooks/use-backend-profile'
import { isUnauthorized } from '@/hooks/use-study'

export type GateState = 'checking' | 'allowed' | 'needsKey' | 'invalid'

const fetcher = async ([url]: readonly [string, number]) => {
  const res = await apiFetch(url)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return res.json()
}

/**
 * Acceso a un módulo de la interfaz con la clave del investigador. La clave se valida
 * contra una ruta protegida (/api/catalog, misma clave SWR que useCatalog: una sola
 * consulta compartida). En development sin claves el módulo queda abierto.
 */
export function useResearcherGate(baseUrl: string, enabled = true): GateState {
  const { profile, isLoading: profileLoading } = useBackendProfile(baseUrl)
  const { version, hasKey } = useResearcherAccess(baseUrl)
  const mustCheck = enabled && hasKey
  const { data, error } = useSWR(mustCheck ? [`${baseUrl}/api/catalog`, version] : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  if (profile === 'development') return 'allowed'
  if (!hasKey) return profileLoading ? 'checking' : 'needsKey'
  if (data) return 'allowed'
  if (error) return isUnauthorized(error) ? 'invalid' : 'allowed'
  return 'checking'
}
