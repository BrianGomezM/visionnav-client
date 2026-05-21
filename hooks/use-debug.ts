'use client'

import { useState, useCallback } from 'react'

// Types matching the actual API response
export interface BBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface RawDetection {
  label: string
  confidence: number
  class_id: number
  bbox: BBox
}

export interface SpatialObject {
  label: string
  posicion: string
  zona: string
  categoria: string
  prioridad: number
  tamano: number
  confianza: string
  count: number
}

export interface StepsObject {
  label: string
  posicion: string
  pasos: number
  tamano: number
}

export interface FreeSpace {
  zonas: {
    left: number
    center: number
    right: number
  }
  raw_zonas: {
    left: number
    center: number
    right: number
  }
  mejor_direccion: string
  situacion: 'clear' | 'front_blocked' | 'blocked'
}

export interface MovementDecision {
  instruccion: string
}

export interface Scenario {
  tipo: string
  confianza: string
  intro: string
  llm_error: string | null
}

export interface LLMDescription {
  texto: string
  prompt_enviado: string
  llm_error: string | null
}

export interface FinalNarrative {
  intro_escenario: string
  descripcion_entorno: string
  instruccion_movimiento: string
  narrativa_completa: string
}

export interface DebugResponse {
  imagen: {
    original: string
    procesada: string
  }
  threshold: number
  narrativa_final: string
  tiempos: {
    deteccion_ms: number
    espacial_ms: number
    pasos_ms: number
    espacio_ms: number
    decision_ms: number
    escenario_ms: number
    llm_ms: number
    total_ms: number
  }
  diagnostico: string
  pasos: {
    '1_detecciones': {
      total: number
      clases: string[]
      detecciones: RawDetection[]
    }
    '2_analisis_espacial': {
      total: number
      objetos: SpatialObject[]
    }
    '3_estimacion_pasos': {
      advertencia: string
      objetos: StepsObject[]
    }
    '4_espacio_libre': FreeSpace
    '5_decision': MovementDecision
    '6_escenario': Scenario
    '7_descripcion_llm': LLMDescription
    '8_narrativa_final': FinalNarrative
  }
}

interface UseDebugOptions {
  baseUrl: string
  confidenceThreshold: number
}

export function useDebug({ baseUrl, confidenceThreshold }: UseDebugOptions) {
  const [data, setData] = useState<DebugResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debug = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('confidence_threshold', confidenceThreshold.toString())

      const res = await fetch(`${baseUrl}/api/debug-detect`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`)
      }

      const result: DebugResponse = await res.json()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error 
        ? err.message.includes('fetch') || err.message.includes('Failed')
          ? 'No se pudo conectar con la API. Verifica que el servidor este corriendo.'
          : err.message
        : 'Error desconocido'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, confidenceThreshold])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    debug,
    reset,
  }
}
