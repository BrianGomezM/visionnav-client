'use client'

import useSWR from 'swr'

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  version: string
  modelo: {
    nombre: string
    weights: string
    imgsz: number
    iou: number
  }
  llm: {
    proveedor: string
    modelo: string
    activo: boolean
  }
  tts: {
    proveedor: string
    voz: string
    activo: boolean
  }
  configuracion: {
    umbral_default: number
    max_imagen_px: number
  }
}

const fetcher = async (url: string): Promise<HealthResponse> => {
  const res = await fetch(url)
  
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  
  return res.json()
}

interface UseHealthOptions {
  baseUrl: string
  enabled?: boolean
}

export function useHealth({ baseUrl, enabled = true }: UseHealthOptions) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<HealthResponse>(
    enabled ? `${baseUrl}/api/health` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 5000,
    }
  )

  const errorMessage = error
    ? error.message?.includes('fetch') || error.message?.includes('Failed')
      ? 'No se pudo conectar con la API. Verifica que el servidor esté corriendo.'
      : error.message
    : null

  return {
    data: data ?? null,
    isLoading,
    isRefreshing: isValidating && !!data,
    error: errorMessage,
    refresh: () => mutate(),
  }
}
