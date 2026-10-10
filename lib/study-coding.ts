/**
 * Codificación de respuestas con referencia definida (estudio v2, 2026-10-10).
 *
 * El investigador ya no transcribe: la respuesta queda grabada y aquí solo marca, frente a la
 * referencia de la prueba (lo que dijo la narrativa congelada), qué objetos nombró el
 * participante, dónde ubicó cada uno, cuál dijo que estaba más cerca, qué cambios notó y por
 * dónde avanzaría. Estas funciones convierten esas marcas en el formato que guarda el servidor
 * (comprension, percepcion_cambio, decision) y al revés, para poder editar una respuesta.
 */
import type { Lado, Referencia } from '@/hooks/use-catalog'
import type { Codificacion, Comprension, ObjetoCodificado, PercepcionCambio, StudyResponseRecord } from '@/lib/study-protocol'

export type LadoRespuesta = Lado | 'no_sabe'
export type NotoCambio = 'si' | 'no' | 'no_responde'

export interface CodingState {
  /** OBJ-01: objeto de la narrativa → lo nombró. */
  nombrados: Record<string, boolean>
  /** OBJ-01: objetos que mencionó y no estaban, separados por comas. */
  inventados: string
  /** OBJ-01: respuesta a la pregunta de relación (un objeto de la referencia), o 'no_sabe'. */
  cercano: string | null
  /** OBJ-02: lado que dijo para cada objeto. */
  lados: Record<string, LadoRespuesta | null>
  /** OBJ-02: pasos que dijo para cada objeto (número escrito por el investigador). */
  pasos: Record<string, string>
  /** OBJ-04: ¿notó algún cambio? */
  notoCambio: NotoCambio | null
  /** OBJ-04: cambios reales (de la referencia) que mencionó. */
  cambios: string[]
  /** OBJ-04: otro cambio que mencionó (no está en la referencia). */
  cambioOtro: string
  /** OBJ-03/OBJ-04: direcciones por las que dijo que podría avanzar, o ['no_responde']. */
  direcciones: string[]
}

export const EMPTY_CODING: CodingState = {
  nombrados: {}, inventados: '', cercano: null, lados: {}, pasos: {}, notoCambio: null, cambios: [], cambioOtro: '', direcciones: [],
}

export const LADO_TEXTO: Record<LadoRespuesta, string> = {
  izquierda: 'a la izquierda', frente: 'al frente', derecha: 'a la derecha', no_sabe: 'no sabe',
}

/** Tolerancia de la distancia: el participante coincide si dice los pasos de la narrativa ±1. */
export const DIST_TOLERANCIA = 1

export function pasosCoinciden(dicho: string | undefined, ref: number | null): 'si' | 'no' | 'no_reportada' {
  const n = Number.parseInt((dicho ?? '').trim(), 10)
  if (Number.isNaN(n)) return 'no_reportada'
  if (ref === null) return 'no_reportada'
  return Math.abs(n - ref) <= DIST_TOLERANCIA ? 'si' : 'no'
}

const LADO_DE_TEXTO: Record<string, LadoRespuesta> = Object.fromEntries(
  Object.entries(LADO_TEXTO).map(([k, v]) => [v, k as LadoRespuesta])
)

export interface CodingPayload {
  comprension?: Comprension
  percepcion_cambio?: PercepcionCambio
  cambios_percibidos?: string[]
  cambio_otro?: string
}

/** Marcas del investigador → campos de la respuesta que guarda el servidor. */
export function codingToPayload(cod: Codificacion[], ref: Referencia | null | undefined, st: CodingState): CodingPayload {
  const out: CodingPayload = {}
  const objs = ref?.objetos ?? []
  if (cod.includes('objetos') || cod.includes('relaciones') || cod.includes('ubicacion') || cod.includes('distancia')) {
    const objetos: ObjetoCodificado[] = objs.map((o) => {
      const lado = st.lados[o.nombre] ?? null
      const pasos = (st.pasos[o.nombre] ?? '').trim()
      return {
        objeto: o.nombre,
        identificado: cod.includes('objetos') ? Boolean(st.nombrados[o.nombre]) : false,
        ubicacion_reportada: cod.includes('ubicacion') && lado ? LADO_TEXTO[lado] : null,
        ubicacion_correcta: !cod.includes('ubicacion') || !lado ? 'no_reportada' : lado === o.lado ? 'si' : 'no',
        distancia_reportada: cod.includes('distancia') && pasos ? `${pasos} pasos` : null,
        distancia_correcta: cod.includes('distancia') ? pasosCoinciden(pasos, o.pasos) : 'no_reportada',
      }
    })
    const relaciones =
      cod.includes('relaciones') && ref?.relacion
        ? [{
            relacion: `${ref.relacion.pregunta} → ${ref.relacion.respuesta}`,
            respuesta: st.cercano === null ? null : st.cercano === 'no_sabe' ? 'No sabe' : st.cercano,
            comprendida: (st.cercano === null ? 'no_evaluada' : st.cercano === ref.relacion.respuesta ? 'si' : 'no') as 'si' | 'no' | 'no_evaluada',
          }]
        : []
    const inventados = cod.includes('objetos') ? st.inventados.split(',').map((s) => s.trim()).filter(Boolean) : []
    if (objetos.length || relaciones.length || inventados.length) out.comprension = { objetos, objetos_inventados: inventados, relaciones }
  }
  if (cod.includes('cambio') && st.notoCambio) {
    const reales = st.notoCambio === 'si' ? st.cambios.filter((c) => (ref?.cambios ?? []).includes(c)) : []
    const otro = st.notoCambio === 'si' ? st.cambioOtro.trim() : ''
    out.percepcion_cambio =
      st.notoCambio === 'no' ? 'no_menciona_cambio'
        : st.notoCambio === 'no_responde' ? 'no_responde'
          : reales.length ? 'menciona_cambio_real' : 'menciona_cambio_inexistente'
    out.cambios_percibidos = reales
    if (otro) out.cambio_otro = otro
  }
  return out
}

/** Lo que falta marcar antes de guardar una prueba formal. */
export function codingBlockers(cod: Codificacion[], ref: Referencia | null | undefined, st: CodingState, hasDecision: boolean): string[] {
  const out: string[] = []
  if (cod.includes('relaciones') && ref?.relacion && st.cercano === null) out.push('Marque qué respondió a la pregunta de relación (o «No sabe»).')
  if (cod.includes('ubicacion')) {
    const sin = (ref?.objetos ?? []).filter((o) => !st.lados[o.nombre]).map((o) => o.nombre)
    if (sin.length) out.push(`Marque dónde ubicó: ${sin.join(', ')} (o «No sabe»).`)
  }
  if (cod.includes('cambio')) {
    if (!st.notoCambio) out.push('Marque si notó algún cambio.')
    else if (st.notoCambio === 'si' && !st.cambios.length && !st.cambioOtro.trim()) out.push('Marque qué cambio mencionó o escríbalo en «Otro cambio».')
  }
  if (hasDecision && !st.direcciones.length) out.push('Marque por dónde dijo que podría avanzar (o «No responde»).')
  return out
}

/** Respuesta guardada → marcas, para editarla. */
export function codingFromRecord(r: StudyResponseRecord, ref: Referencia | null | undefined): CodingState {
  const st: CodingState = { ...EMPTY_CODING, nombrados: {}, lados: {}, pasos: {}, cambios: [], direcciones: [] }
  for (const o of r.comprension?.objetos ?? []) {
    if (o.identificado) st.nombrados[o.objeto] = true
    if (o.ubicacion_reportada) st.lados[o.objeto] = LADO_DE_TEXTO[o.ubicacion_reportada] ?? null
    const n = (o.distancia_reportada ?? '').match(/\d+/)
    if (n) st.pasos[o.objeto] = n[0]
  }
  st.inventados = (r.comprension?.objetos_inventados ?? []).join(', ')
  const rel = (r.comprension?.relaciones ?? [])[0]
  if (rel && rel.respuesta) st.cercano = rel.respuesta === 'No sabe' ? 'no_sabe' : rel.respuesta
  if (r.percepcion_cambio) {
    st.notoCambio = r.percepcion_cambio === 'no_menciona_cambio' ? 'no' : r.percepcion_cambio === 'no_responde' ? 'no_responde' : 'si'
  }
  st.cambios = [...(r.cambios_percibidos ?? [])].filter((c) => !ref?.cambios || ref.cambios.includes(c))
  st.cambioOtro = r.cambio_otro ?? ''
  const d = r.decision
  if (d) st.direcciones = d.seleccionadas?.length ? [...d.seleccionadas] : d.seleccionada ? d.seleccionada.split('+') : []
  return st
}

/** Respuestas vigentes: las que no fueron corregidas por otra posterior. */
export function vigentes<T extends { response_id: string; reemplaza?: string | null }>(rs: T[]): T[] {
  const corregidas = new Set(rs.map((r) => r.reemplaza).filter(Boolean))
  return rs.filter((r) => !corregidas.has(r.response_id))
}
