'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'
import { ApiRequestError, parseApiError } from '@/lib/api-errors'
import { useResearcherAccess } from '@/hooks/use-backend-profile'

// ─────────────────────────────────────────────
// TIPOS — /api/metrics/summary
// ─────────────────────────────────────────────
export interface MetricsSummary {
  total_solicitudes: number
  periodo: {
    desde: string | null
    hasta: string | null
  }
  tiempo_total_ms: {
    promedio: number | null
    p50: number | null
    p90: number | null
    p95: number | null
    p99: number | null
    max: number | null
  }
  tiempo_deteccion_ms: {
    promedio: number | null
    p95: number | null
  }
  objetos_por_imagen: {
    promedio: number | null
    max: number | null
  }
  escenarios_detectados: Record<string, number>
  message?: string
}

// ─────────────────────────────────────────────
// TIPOS — /api/metrics/latency
// ─────────────────────────────────────────────
export interface LatencyPoint {
  ts: string
  total_ms: number | null
  deteccion_ms: number | null
  objetos: number | null
  escenario: string | null
}

export interface MetricsLatency {
  count: number
  data: LatencyPoint[]
}

// ─────────────────────────────────────────────
// FETCHER GENÉRICO
// ─────────────────────────────────────────────
// La clave de SWR es [url, versión de la clave del investigador]: al guardar la
// clave cambia la versión y se vuelve a consultar, descartando un 401 previo.
// Rutas del investigador: requieren X-API-Key (apiFetch) en study/production.
const fetcher = async ([url]: readonly [string, number]) => {
  const res = await apiFetch(url)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return res.json()
}

const isUnauthorized = (err: unknown) => err instanceof ApiRequestError && err.info.status === 401

// ─────────────────────────────────────────────
// HOOK — Resumen de métricas de producción
// ─────────────────────────────────────────────
export function useMetricsSummary(baseUrl: string, enabled = true) {
  const { version, canQuery, needsKey } = useResearcherAccess(baseUrl)
  const { data, error, isLoading, mutate } = useSWR<MetricsSummary>(
    enabled && canQuery ? [`${baseUrl}/api/metrics/summary`, version] : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    needsKey,
    unauthorized: isUnauthorized(error),
    refresh: () => mutate(),
  }
}

// ─────────────────────────────────────────────
// HOOK — Historial de latencias
// ─────────────────────────────────────────────
export function useMetricsLatency(baseUrl: string, limit = 100, enabled = true) {
  const { version, canQuery, needsKey } = useResearcherAccess(baseUrl)
  const { data, error, isLoading, mutate } = useSWR<MetricsLatency>(
    enabled && canQuery ? [`${baseUrl}/api/metrics/latency?limit=${limit}`, version] : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    needsKey,
    unauthorized: isUnauthorized(error),
    refresh: () => mutate(),
  }
}
