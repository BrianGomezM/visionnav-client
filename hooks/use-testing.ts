'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

// ─────────────────────────────────────────────
// TIPOS — /api/test/functional
// ─────────────────────────────────────────────
export interface FunctionalCase {
  id: string
  descripcion: string
  resultado: 'PASS' | 'FAIL'
  tiempo_ms: number
  detalle: Record<string, unknown>
  error: string | null
}

export interface FunctionalSuite {
  suite: string
  ejecutado: string
  total: number
  passed: number
  failed: number
  tasa_exito_pct: number
  tiempo_suite_ms: number
  casos: FunctionalCase[]
}

// ─────────────────────────────────────────────
// TIPOS — /api/test/load
// ─────────────────────────────────────────────
export interface LoadTestResult {
  suite: string
  ejecutado: string
  configuracion: {
    n_requests: number
    concurrency: number
    imagen: string
    imagen_usada: string
  }
  resultados: {
    exitosas: number
    fallidas: number
    tasa_exito_pct: number
    tiempo_total_ms: number
    throughput_rps: number
  }
  latencias_ms: {
    promedio: number | null
    min: number | null
    max: number | null
    p50: number | null
    p90: number | null
    p95: number | null
    p99: number | null
  }
  errores: Array<Record<string, unknown>>
}

// ─────────────────────────────────────────────
// TIPOS — /api/test/results
// ─────────────────────────────────────────────
export interface TestHistory {
  count: number
  results: Array<FunctionalSuite | LoadTestResult>
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
// HOOK — Historial de resultados
// ─────────────────────────────────────────────
export function useTestResults(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<TestHistory>(
    enabled ? `${baseUrl}/api/test/results` : null,
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
// HOOK — Ejecutar pruebas funcionales
// ─────────────────────────────────────────────
export function useFunctionalTests(baseUrl: string) {
  const [result, setResult] = useState<FunctionalSuite | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (targetBaseUrl?: string) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const form = new FormData()
        form.append('base_url', targetBaseUrl ?? baseUrl)

        const res = await fetch(`${baseUrl}/api/test/functional`, {
          method: 'POST',
          body: form,
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`)
        }
        setResult(data)
        return data as FunctionalSuite
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

  return { result, isLoading, error, run }
}

// ─────────────────────────────────────────────
// HOOK — Ejecutar prueba de carga
// ─────────────────────────────────────────────
export function useLoadTest(baseUrl: string) {
  const [result, setResult] = useState<LoadTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (nRequests: number, concurrency: number, imagePath = 'test_images/sala.jpg') => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const form = new FormData()
        form.append('n_requests', nRequests.toString())
        form.append('concurrency', concurrency.toString())
        form.append('base_url', baseUrl)
        form.append('image_path', imagePath)

        const res = await fetch(`${baseUrl}/api/test/load`, {
          method: 'POST',
          body: form,
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`)
        }
        setResult(data)
        return data as LoadTestResult
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

  return { result, isLoading, error, run }
}
