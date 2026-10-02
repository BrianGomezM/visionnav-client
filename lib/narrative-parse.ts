/**
 * Sugerencias para codificar la respuesta: objetos (con la ubicación y la distancia que dijo
 * la narrativa) y frases con relaciones espaciales. Es una ayuda heurística sobre el texto:
 * el investigador revisa y corrige antes de guardar.
 */

export type Ubicacion = 'izquierda' | 'centro' | 'derecha'

const LOCATIONS: [RegExp, Ubicacion][] = [
  [/\b(a tu izquierda|hacia (tu|la) izquierda|a la izquierda|por la izquierda)\b/i, 'izquierda'],
  [/\b(a tu derecha|hacia (tu|la) derecha|a la derecha|por la derecha)\b/i, 'derecha'],
  [/\b(al frente|de frente|frente a ti|delante de ti|enfrente|al centro|en el centro|justo delante)\b/i, 'centro'],
]
// «un poco más adelante» relaciona un objeto con el anterior (p. ej. la mesa detrás de la silla).
const RELATION = /\b(delante de|detrás de|al lado de|junto a|junto al|sobre la|sobre el|encima de|debajo de|entre|más adelante|más atrás)\b/i
// Frases de contexto o de acción: no nombran un objeto de la escena.
const SKIP = /^(parece|puedes|podrías|hay espacio|camina|avanza|te encuentras|estás|el camino|no hay|ten cuidado|continúa|sigue|tienes|el paso|gira|la salida)/i
// Lookahead en vez de \b: \b no funciona tras vocales acentuadas («está»).
const CUT = /\s+(?:a tu|a la|al|hacia|frente|delante|enfrente|en el centro|justo|por la|un poco|está|están|se encuentra|se encuentran)(?=[\s,]|$)/i
const ARTICLE = /^(hay\s+)?(un|una|unos|unas|el|la|los|las)\s+/i
const STEPS = /(\d+)\s+pasos?/i

/**
 * Ubicación y distancia que dijo la narrativa, codificadas al final del nombre del objeto:
 * "persona (derecha)" o "silla (derecha, ~5 pasos)".
 */
export const NARRATED_RE = /\s*\((izquierda|centro|derecha)(?:, ~(\d+) pasos?)?\)\s*$/

export function narratedLocation(objeto: string): Ubicacion | null {
  return (NARRATED_RE.exec(objeto)?.[1] as Ubicacion | undefined) ?? null
}

/** Pasos que dijo la narrativa para ese objeto, o null. */
export function narratedSteps(objeto: string): number | null {
  const m = NARRATED_RE.exec(objeto)?.[2]
  return m ? Number(m) : null
}

export function parseNarrative(text: string): {
  objetos: { objeto: string; ubicacion: Ubicacion | null; pasos: number | null }[]
  relaciones: string[]
} {
  const objetos: { objeto: string; ubicacion: Ubicacion | null; pasos: number | null }[] = []
  const relaciones: string[] = []
  const sentences = text
    .split(/(?<=[.;!?])\s+/)
    .map((s) => s.trim().replace(/[.;!?]+$/, ''))
    .filter(Boolean)
  for (const s of sentences) {
    if (SKIP.test(s)) continue
    if (RELATION.test(s)) relaciones.push(s)
    const loc = LOCATIONS.find(([re]) => re.test(s))?.[1] ?? null
    if (!loc) continue
    const obj = s.split(CUT)[0].replace(ARTICLE, '').trim().toLowerCase()
    const pasos = STEPS.exec(s)?.[1]
    if (obj.length >= 2 && obj.length <= 40 && !objetos.some((o) => o.objeto === obj && o.ubicacion === loc))
      objetos.push({ objeto: obj, ubicacion: loc, pasos: pasos ? Number(pasos) : null })
  }
  return { objetos, relaciones }
}

/** Nombre del objeto con lo que dijo la narrativa, en el formato de NARRATED_RE. */
export function codedObjectName(o: { objeto: string; ubicacion: Ubicacion | null; pasos: number | null }): string {
  if (!o.ubicacion) return o.objeto
  return `${o.objeto} (${o.ubicacion}${o.pasos !== null ? `, ~${o.pasos} pasos` : ''})`
}
