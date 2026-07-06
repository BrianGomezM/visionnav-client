'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

// ─────────────────────────────────────────────
// TIPOS — /api/dataset/upload
// ─────────────────────────────────────────────
export interface UploadResult {
  status: 'stored' | 'duplicate' | 'error'
  id: string
  image_path?: string
  auto_labeled: boolean
  objects_found: number
  objects: Array<{ label: string; confidence: number; class_id: number }>
  label_error: string | null
  message?: string
}

// ─────────────────────────────────────────────
// TIPOS — /api/dataset/stats
// ─────────────────────────────────────────────
export interface DatasetStats {
  total_images: number
  labeled_images: number
  unlabeled_images?: number
  total_objects?: number
  avg_objects_image?: number
  by_scene_type?: Record<string, number>
  top_classes?: Record<string, number>
  finetune_ready: boolean
  finetune_min_images: number
  message?: string
  note?: string
}

// ─────────────────────────────────────────────
// TIPOS — /api/finetune/prepare y /api/finetune/status
// ─────────────────────────────────────────────
export interface FinetuneResult {
  status: 'ready' | 'not_prepared' | 'insufficient_data'
  yaml_path?: string
  train_images?: number
  val_images?: number
  total_images?: number
  total_classes?: number
  class_names?: string[]
  comando_yolo?: string
  labeled_count?: number
  required?: number
  message?: string
  nota?: string
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
// HOOK — Estadísticas del dataset
// ─────────────────────────────────────────────
export function useDatasetStats(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<DatasetStats>(
    enabled ? `${baseUrl}/api/dataset/stats` : null,
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
// HOOK — Estado del fine-tuning
// ─────────────────────────────────────────────
export function useFinetuneStatus(baseUrl: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<FinetuneResult>(
    enabled ? `${baseUrl}/api/finetune/status` : null,
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
// HOOK — Subir imagen al dataset
// ─────────────────────────────────────────────
export function useDatasetUpload(baseUrl: string) {
  const [result, setResult] = useState<UploadResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File, sceneType: string, autoLabel: boolean) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const form = new FormData()
        form.append('file', file)
        form.append('scene_type', sceneType)
        form.append('auto_label', autoLabel.toString())

        const res = await fetch(`${baseUrl}/api/dataset/upload`, {
          method: 'POST',
          body: form,
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`)
        }
        setResult(data)
        return data as UploadResult
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

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, isLoading, error, upload, reset }
}

// ─────────────────────────────────────────────
// HOOK — Preparar dataset para fine-tuning
// ─────────────────────────────────────────────
export function useFinetunePrepare(baseUrl: string) {
  const [result, setResult] = useState<FinetuneResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prepare = useCallback(
    async (trainSplit = 0.8, minImages = 10) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const form = new FormData()
        form.append('train_split', trainSplit.toString())
        form.append('min_images', minImages.toString())

        const res = await fetch(`${baseUrl}/api/finetune/prepare`, {
          method: 'POST',
          body: form,
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`)
        }
        setResult(data)
        return data as FinetuneResult
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes('fetch') || err.message.includes('Failed')
              ? 'No se pudo conectar con la API.'
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

  return { result, isLoading, error, prepare }
}
