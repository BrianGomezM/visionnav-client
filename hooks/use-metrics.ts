'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

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
// TIPOS — /api/metrics (sesión en memoria)
// ─────────────────────────────────────────────
export interface MetricsSession {
  total_requests: number
  started_at: string
  objetos?: {
    total_detectados: number
    promedio_por_imagen: number
  }
  tiempos_promedio_ms?: {
    total: number
    deteccion: number
    llm: number
    tts: number
  }
  tts?: {
    exitoso: number
    fallido: number
    tasa_exito: string
  }
  llm?: {
    errores: number
  }
  mensaje?: string
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
// HOOK — Resumen de métricas de producción
// ─────────────────────────────────────────────
export function useMetricsSummary(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MetricsSummary>(
    enabled ? `${baseUrl}/api/metrics/summary` : null,
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
// HOOK — Historial de latencias
// ─────────────────────────────────────────────
export function useMetricsLatency(baseUrl: string, limit = 100, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MetricsLatency>(
    enabled ? `${baseUrl}/api/metrics/latency?limit=${limit}` : null,
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
// HOOK — Métricas de sesión en memoria
// ─────────────────────────────────────────────
export function useMetricsSession(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MetricsSession>(
    enabled ? `${baseUrl}/api/metrics` : null,
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
