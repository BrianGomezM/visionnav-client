'use client'

import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'

/**
 * Catálogo único de pruebas (GET /api/catalog). Sustituye a lib/study-tests.ts:
 * las pruebas ya no se definen en el cliente sino en el backend
 * (app/catalog/catalog.yaml). La respuesta nunca incluye ground truth.
 */

export type StudyTrack = 'objetivo' | 'piloto'
export type TestKind = 'imagen' | 'escala' | 'ruta' | 'texto'

/** Forma que usa la pestaña de estudio (idéntica a la del antiguo lib/study-tests.ts). */
export interface StudyTest {
  id: string
  nombre: string
  objetivo: string
  /** Instrucción exacta que el investigador debe leer/seguir, para no improvisar entre participantes. */
  guionInvestigador: string
  tipo: TestKind
  /** Para tipo 'escala': criterios individuales a calificar 1-5. */
  criterios?: string[]
  /** Métrica(s) que esta prueba alimenta, para trazabilidad con el Capítulo 5. */
  metricas: string[]
}

export interface CatalogUserTest {
  test_id: string
  id: string
  pista: StudyTrack
  nombre: string
  objetivo: string
  guion_investigador: string
  tipo: TestKind
  criterios: string[] | null
  metricas: string[]
  metricas_texto: string[]
  tipo_evaluacion: string
  estimulos: string | string[] | null
  disponibilidad: { investigador: boolean; participante: boolean }
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
}

export interface Catalog {
  schema_version: number
  metricas: { id: string; nombre: string; estado: string }[]
  datasets: { id: string; nombre: string; estado: string; descripcion: string }[]
  estimulos: CatalogStimulus[]
  pruebas_tecnicas: CatalogTechnicalTest[]
  pruebas_usuario: CatalogUserTest[]
}

const fetcher = async (url: string): Promise<Catalog> => {
  const res = await apiFetch(url)
  if (res.status === 401) throw new Error('Se requiere la clave del investigador (ajustes).')
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

export function toStudyTest(t: CatalogUserTest): StudyTest {
  return {
    id: t.id,
    nombre: t.nombre,
    objetivo: t.objetivo,
    guionInvestigador: t.guion_investigador,
    tipo: t.tipo,
    criterios: t.criterios ?? undefined,
    metricas: t.metricas_texto,
  }
}

export function useCatalog(baseUrl: string) {
  const { data, error, isLoading, mutate } = useSWR<Catalog>(`${baseUrl}/api/catalog`, fetcher, {
    revalidateOnFocus: false,
  })

  const testsForTrack = (track: StudyTrack): StudyTest[] =>
    (data?.pruebas_usuario ?? []).filter((t) => t.pista === track).map(toStudyTest)

  return {
    catalog: data ?? null,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    isLoading,
    refresh: mutate,
    testsForTrack,
  }
}
