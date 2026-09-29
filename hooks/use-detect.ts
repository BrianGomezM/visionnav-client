'use client'

import { useState, useCallback } from 'react'
import { apiFetch, ApiTimeoutError } from '@/lib/api-client'

export const DETECT_TIMEOUT_MS = 180_000
import { ApiRequestError, parseApiError, parseDegradations } from '@/lib/api-errors'

export type TtsUnavailableReason =
  | 'cuota_excedida'
  | 'error_sintesis'
  | 'tts_desactivado'
  | 'tts_omitido_evaluacion'
  | 'tiempo_agotado'
  | 'limite_proveedor'
  | 'proveedor_no_disponible'
  | null

export interface AudioInfo {
  disponible: boolean
  razon?: TtsUnavailableReason
  archivo?: string | null
  content_type?: string | null
  data_base64?: string | null
  data_uri?: string | null
  tamano_bytes?: number | null
}

export interface UmbralInfo {
  umbral_ajustes: number
  piso: number
  regla: string
  objetos: { objeto: string; clase: string; confianza: number; minimo_clase: number | null; umbral_efectivo: number }[]
}

export interface DetectResponse {
  /** Umbral efectivo por objeto (informativo; backends anteriores no lo envían). */
  umbral?: UmbralInfo
  status: 'success' | 'error'
  /** Cabecera X-Request-ID (para soporte). */
  request_id?: string | null
  /** Cabecera X-Degradacion: partes opcionales que no se generaron con el componente previsto. */
  degradaciones?: string[]
  narrativa_final: string
  audio: AudioInfo
  /** Imagen con bounding boxes dibujados por detection_visualizer */
  imagen_anotada: {
    disponible: boolean
    archivo: string | null
    /** URL relativa al servidor: /detections/<nombre>.jpg */
    url: string | null
    data_base64: string | null
    /** data URI lista para usar en <img src="..."> */
    data_uri: string | null
  }
  escenario: {
    tipo: string
    confianza: 'alta' | 'media' | 'baja'
    intro: string
  }
  metricas: {
    deteccion_ms: number
    espacial_ms: number
    pasos_ms: number
    espacio_ms: number
    decision_ms: number
    escenario_ms: number
    llm_ms: number
    visualizer_ms?: number
    total_ms: number
    tts_ms?: number
    /** Voz que generó el audio (id del selector). */
    tts_modelo?: string
    objetos_detectados: number
    confianza_prom?: number
    umbral_confianza: number
    imagen: {
      original: string
      procesada: string
    }
  }
}

interface UseDetectOptions {
  baseUrl: string
  /**
   * Umbral enviado al backend. null = no enviarlo: el servidor aplica su valor por
   * defecto, que es el congelado (0.35). El estudio usa null para que un cambio en
   * Ajustes no altere la configuración experimental.
   */
  confidenceThreshold: number | null
  /** ID de modelo Gemini TTS a usar, o null para el TTS_MODEL por defecto del servidor. */
  ttsModel?: string | null
}

export function useDetect({ baseUrl, confidenceThreshold, ttsModel }: UseDetectOptions) {
  const [data, setData] = useState<DetectResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detect = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      const form = new FormData()
      form.append('file', file)
      if (confidenceThreshold !== null) form.append('confidence_threshold', confidenceThreshold.toString())
      form.append('debug', 'false')
      if (ttsModel) {
        form.append('tts_model', ttsModel)
      }

      // Peor caso normal del backend ≈ 2 min (LLM con reintentos + TTS 60 s);
      // por debajo del límite del proxy de Azure (~230 s).
      const res = await apiFetch(`${baseUrl}/api/detect`, {
        method: 'POST',
        body: form,
        timeoutMs: DETECT_TIMEOUT_MS,
      })

      if (!res.ok) {
        throw new ApiRequestError(await parseApiError(res))
      }

      const result: DetectResponse = await res.json()
      // Trazabilidad y degradaciones declaradas por el backend (cabeceras)
      result.request_id = res.headers.get('X-Request-ID')
      result.degradaciones = parseDegradations(res)
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof ApiRequestError || err instanceof ApiTimeoutError
        ? err.message                                   // mensaje del contrato + ID de solicitud / timeout
        : err instanceof Error
          ? err.message.includes('fetch') || err.message.includes('Failed')
            ? 'No se pudo conectar con la API. Verifica que el servidor este corriendo.'
            : err.message
          : 'Error desconocido'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, confidenceThreshold, ttsModel])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    detect,
    reset,
  }
}
