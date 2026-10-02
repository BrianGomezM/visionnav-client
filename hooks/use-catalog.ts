'use client'

import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'
import { ApiRequestError, parseApiError } from '@/lib/api-errors'
import { useResearcherAccess } from '@/hooks/use-backend-profile'

/**
 * Catálogo único de pruebas (GET /api/catalog), definido en el backend
 * (app/catalog/catalog.yaml). El cliente NO duplica el catálogo. La respuesta
 * nunca incluye ground truth.
 */

export type StudyTrack = 'objetivo' | 'piloto'
export type TestKind = 'imagen' | 'escala' | 'ruta' | 'texto'
export type EstadoEstimulos = 'por_definir' | 'no_requiere' | 'definido'

export interface CatalogUserTest {
  test_id: string
  id: string
  pista: StudyTrack
  nombre: string
  objetivo: string
  guion_investigador: string
  tipo: TestKind
  criterios: string[] | null
  /** Qué se codifica de la respuesta (frente a la narrativa): objetos, relaciones, ubicación, distancia, cambio. */
  codificacion: ('objetos' | 'relaciones' | 'ubicacion' | 'distancia' | 'cambio')[]
  metricas: string[]
  metricas_texto: string[]
  tipo_evaluacion: string
  /** "POR_DEFINIR", null (no usa estímulo) o lista de stimulus_id. */
  estimulos: 'POR_DEFINIR' | string[] | null
  estado_estimulos: EstadoEstimulos
  requiere_estimulo: boolean
  ejecutable_formal: boolean
  disponibilidad: { investigador: boolean; participante: boolean }
  /** Tarea de decisión (app/catalog/decisiones.yaml). Nunca incluye la alternativa esperada. */
  decision?: DecisionDefinition | null
}

export interface DecisionDefinition {
  pregunta: string
  alternativas: { id: string; texto: string }[]
  estado_esperadas: 'definido' | 'por_definir'
  /** Estímulos con alternativa esperada definida (el valor queda en el servidor). */
  esperada_definida_para: string[]
  /** Solo para sesiones de prueba técnica (PTEST) en modo ensayo. */
  fixtures_tecnicos: { id: string; stimulus_id: string }[]
}

export interface CatalogTechnicalTest {
  test_id: string
  plantilla: string
  nombre: string
  dataset: string
  stimulus_id: string
  objetivo: string
  descripcion: string
  metricas: string[]
  tipo_evaluacion: string
  disponibilidad: { investigador: boolean; participante: boolean }
}

export interface CatalogStimulus {
  stimulus_id: string
  dataset: string
  bloque: string
  sha256: string
  valido: boolean
  imagen_url: string | null
  /** Escena de práctica (familiarización): solo ensayo. */
  practica?: boolean
  /** Audio congelado: lo único que se reproduce en las pruebas formales. */
  audio_congelado?: FrozenAudio | null
}

export interface FrozenAudio {
  sha256: string
  content_type: string
  tamano_bytes: number
  duracion_s: number | null
  narrativa_final: string
  tts_modelo: string
  audio_url: string
}

export interface Catalog {
  schema_version: number
  metricas: { id: string; nombre: string; estado: string }[]
  datasets: { id: string; nombre: string; estado: string; descripcion: string }[]
  estimulos: CatalogStimulus[]
  pruebas_tecnicas: CatalogTechnicalTest[]
  pruebas_usuario: CatalogUserTest[]
}

const fetcher = async ([url]: readonly [string, number]): Promise<Catalog> => {
  const res = await apiFetch(url)
  if (!res.ok) throw new ApiRequestError(await parseApiError(res))
  return res.json()
}

// En study/production no se consulta sin clave (useResearcherAccess): sin 401 al cargar.
export function useCatalog(baseUrl: string, enabled = true) {
  const { version, canQuery } = useResearcherAccess(baseUrl)
  const { data, error, isLoading, mutate } = useSWR<Catalog>(
    enabled && canQuery ? [`${baseUrl}/api/catalog`, version] : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  return {
    catalog: data ?? null,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    isLoading,
    refresh: mutate,
  }
}
