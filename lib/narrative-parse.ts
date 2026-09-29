/**
 * Sugerencias para codificar la respuesta: objetos (con la ubicación que dijo la
 * narrativa) y frases con relaciones espaciales. Es una ayuda heurística sobre el
 * texto: el investigador revisa y corrige antes de guardar.
 */

export type Ubicacion = 'izquierda' | 'centro' | 'derecha'

const LOCATIONS: [RegExp, Ubicacion][] = [
  [/\b(a tu izquierda|hacia (tu|la) izquierda|a la izquierda|por la izquierda)\b/i, 'izquierda'],
  [/\b(a tu derecha|hacia (tu|la) derecha|a la derecha|por la derecha)\b/i, 'derecha'],
  [/\b(al frente|de frente|frente a ti|delante de ti|enfrente|al centro|en el centro|justo delante)\b/i, 'centro'],
]
const RELATION = /\b(delante de|detrás de|al lado de|junto a|junto al|sobre la|sobre el|encima de|debajo de|entre)\b/i
// Frases de contexto o de acción: no nombran un objeto de la escena.
const SKIP = /^(parece|puedes|podrías|hay espacio|camina|avanza|te encuentras|estás|el camino|no hay|ten cuidado|continúa|sigue)/i
// Lookahead en vez de \b: \b no funciona tras vocales acentuadas («está»).
const CUT = /\s+(?:a tu|a la|al|hacia|frente|delante|enfrente|en el centro|justo|por la|está|están|se encuentra|se encuentran)(?=[\s,]|$)/i
const ARTICLE = /^(hay\s+)?(un|una|unos|unas|el|la|los|las)\s+/i

/** Ubicación que dijo la narrativa, codificada al final del nombre del objeto: "persona (derecha)". */
export const NARRATED_RE = /\s*\((izquierda|centro|derecha)\)\s*$/

export function narratedLocation(objeto: string): Ubicacion | null {
  return (NARRATED_RE.exec(objeto)?.[1] as Ubicacion | undefined) ?? null
}

export function parseNarrative(text: string): { objetos: { objeto: string; ubicacion: Ubicacion | null }[]; relaciones: string[] } {
  const objetos: { objeto: string; ubicacion: Ubicacion | null }[] = []
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
    if (obj.length >= 2 && obj.length <= 40 && !objetos.some((o) => o.objeto === obj && o.ubicacion === loc))
      objetos.push({ objeto: obj, ubicacion: loc })
  }
  return { objetos, relaciones }
}
