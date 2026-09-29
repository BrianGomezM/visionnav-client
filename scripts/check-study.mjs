// Verificación del instrumento de evaluación con usuarios (lib/study-protocol.ts) sin framework de pruebas.
// Uso: node scripts/check-study.mjs
// Transpila el módulo con el TypeScript del proyecto, lo ejecuta y añade comprobaciones
// estáticas del código del cliente (catálogo no duplicado, clave fuera de NEXT_PUBLIC_*,
// etiquetas de formulario y contraste de colores). Solo datos de prueba (PTEST01).
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import ts from 'typescript'

const root = new URL('..', import.meta.url)
const src = readFileSync(new URL('lib/study-protocol.ts', root), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const file = join(mkdtempSync(join(tmpdir(), 'study-')), 'study-protocol.mjs')
writeFileSync(file, js)
const m = await import('file://' + file.replace(/\\/g, '/'))

let n = 0
const check = async (name, fn) => {
  await fn()
  n++
  console.log(`ok  ${name}`)
}

const ficha = () => ({
  condicion_visual: { tipo_ceguera: 'adquirida', etapa_adquisicion: 'adultez', experiencia_visual_previa: 'si' },
  tecnologias: { utiliza: ['lector_pantalla', 'smartphone'], otra_descripcion: null, lectores_pantalla: ['nvda'], lector_otro: null, frecuencia_uso: 'diaria' },
  experiencia_descripcion_audio: 'no',
})

// ── Código anonimizado ──
await check('código: formato P01/PTEST01, nunca un nombre', () => {
  for (const ok of ['P01', 'P120', 'PTEST01']) assert.ok(m.CODE_RE.test(ok), ok)
  for (const bad of ['juan', 'P1', 'p01', 'P01-juan', 'PTEST', '']) assert.ok(!m.CODE_RE.test(bad), bad)
  assert.equal(m.suggestNextCode([]), 'P01')
  assert.equal(m.suggestNextCode(['P01', 'P02', 'PTEST07']), 'P03')
  assert.equal(m.suggestNextCode(['P01', 'PTEST01'], true), 'PTEST02')
})

// ── Ficha ──
await check('ficha válida (objetivo, ceguera adquirida, lector NVDA)', () => {
  assert.deepEqual(m.validateParticipant('PTEST01', 'objetivo', ficha()), {})
})
await check('ficha: condición visual coherente con el tipo', () => {
  const f = ficha()
  f.condicion_visual = { tipo_ceguera: 'no_aplica', etapa_adquisicion: null, experiencia_visual_previa: null }
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', f).tipo_ceguera)
  assert.equal(m.validateParticipant('PTEST01', 'piloto', f).tipo_ceguera, undefined)
  const g = ficha()
  g.condicion_visual.etapa_adquisicion = null
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', g).etapa_adquisicion)
})
await check('ficha: tecnologías asistivas y lector de pantalla', () => {
  const f = ficha()
  f.tecnologias.lectores_pantalla = []
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', f).lectores_pantalla)
  f.tecnologias = { utiliza: ['ninguna', 'smartphone'], otra_descripcion: null, lectores_pantalla: [], lector_otro: null, frecuencia_uso: null }
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', f).utiliza)
  f.tecnologias = { utiliza: ['otra'], otra_descripcion: ' ', lectores_pantalla: [], lector_otro: null, frecuencia_uso: 'ocasional' }
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', f).otra_descripcion)
  f.tecnologias = { utiliza: ['computador'], otra_descripcion: null, lectores_pantalla: [], lector_otro: null, frecuencia_uso: null }
  assert.ok(m.validateParticipant('PTEST01', 'objetivo', f).frecuencia_uso)
})
await check('ficha: normalización (sin lector → no_utiliza; etapa solo si adquirida)', () => {
  const f = ficha()
  f.tecnologias = { utiliza: ['computador'], otra_descripcion: 'x', lectores_pantalla: ['nvda'], lector_otro: 'y', frecuencia_uso: 'diaria' }
  f.condicion_visual = { tipo_ceguera: 'congenita', etapa_adquisicion: 'infancia', experiencia_visual_previa: 'no' }
  const n2 = m.normalizeFicha(f)
  assert.deepEqual(n2.tecnologias.lectores_pantalla, ['no_utiliza'])
  assert.equal(n2.tecnologias.otra_descripcion, null)
  assert.equal(n2.condicion_visual.etapa_adquisicion, null)
})

// ── Consentimiento y contexto ──
await check('consentimiento: las cuatro afirmaciones son obligatorias (la 3 es la grabación)', () => {
  const keys = ['acepta_participar', 'puede_detenerse', 'autoriza_grabacion', 'autoriza_uso_academico']
  const c = { version: 'CI-VisionNav-Piloto v0.3', ...Object.fromEntries(keys.map((k) => [k, true])) }
  assert.ok(m.consentComplete(c))
  for (const k of keys) assert.ok(!m.consentComplete({ ...c, [k]: false }), k)
})
await check('contexto: dispositivo y reproducción "otro" requieren detalle', () => {
  assert.ok(m.validateContext({ dispositivo: 'otro', dispositivo_otro: '', reproduccion_audio: 'audifonos', reproduccion_otro: null }).dispositivo_otro)
  assert.deepEqual(m.validateContext({ dispositivo: 'telefono', dispositivo_otro: null, reproduccion_audio: 'parlantes', reproduccion_otro: null }), {})
})
await check('entorno técnico automático desde el navegador', () => {
  const win = m.parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
  assert.deepEqual([win.navegador, win.sistema_operativo, win.tipo_dispositivo], ['Chrome 140', 'Windows', 'escritorio'])
  const and = m.parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36')
  assert.deepEqual([and.sistema_operativo, and.tipo_dispositivo], ['Android 14', 'telefono'])
  const ios = m.parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1')
  assert.deepEqual([ios.navegador, ios.sistema_operativo, ios.tipo_dispositivo], ['Safari 18', 'iOS 18', 'telefono'])
  const ipad = m.parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5)
  assert.equal(ipad.tipo_dispositivo, 'tableta')
})

// ── Catálogo: POR_DEFINIR nunca es formal ──
const obj01 = { id: 'OBJ-01', pista: 'objetivo', tipo: 'imagen', estado_estimulos: 'por_definir', ejecutable_formal: false, requiere_estimulo: true }
const pil01 = { id: 'PIL-01', pista: 'piloto', tipo: 'escala', estado_estimulos: 'no_requiere', ejecutable_formal: true, requiere_estimulo: false }
await check('prueba POR_DEFINIR: no formal; ensayo solo en piloto/prueba técnica', () => {
  assert.deepEqual(
    [m.executionRule(obj01, 'objetivo', false).formal, m.executionRule(obj01, 'objetivo', false).ensayo],
    [false, false]
  )
  assert.equal(m.executionRule(obj01, 'objetivo', true).ensayo, true)
  assert.match(m.executionRule(obj01, 'objetivo', true).motivo, /POR DEFINIR/)
  const piloto = m.executionRule(obj01, 'piloto', false)
  assert.deepEqual([piloto.formal, piloto.ensayo], [false, true])
})
await check('prueba definida: formal solo en su pista', () => {
  assert.equal(m.executionRule(pil01, 'piloto', false).formal, true)
  assert.equal(m.executionRule(pil01, 'objetivo', false).formal, false)
  const defined = { ...obj01, estado_estimulos: 'definido', ejecutable_formal: true }
  assert.equal(m.executionRule(defined, 'objetivo', false).formal, true)
})

// ── Audio, repeticiones y respuesta ──
await check('repeticiones = reproducciones de tipo "repeticion"', () => {
  const t = '2026-09-28T17:00:00.000Z'
  assert.equal(m.countRepetitions([{ instante: t, tipo: 'inicial' }, { instante: t, tipo: 'repeticion' }, { instante: t, tipo: 'repeticion' }]), 2)
  assert.equal(m.countRepetitions([]), 0)
})
await check('sha256 del audio TTS (base64) igual al de Node', async () => {
  const bytes = Buffer.from('audio de prueba PTEST01')
  const hex = await m.sha256Hex(m.base64ToBytes(bytes.toString('base64')))
  assert.equal(hex, createHash('sha256').update(bytes).digest('hex'))
})
await check('payload: codificación, escalas, errores y comentarios', () => {
  const p = m.buildResponsePayload({
    pruebaId: 'OBJ-01', modo: 'ensayo', estimulo: { origen: 'catalogo', stimulus_id: 'DS1-A1' },
    ejecucion: { request_id: 'r', narrativa_final: 'n', escenario: null, degradaciones: [], umbral_confianza: 0.35,
      audio: { disponible: true, content_type: 'audio/mpeg', sha256: 'a'.repeat(64), tamano_bytes: 3 } },
    audioBase64: 'AAA=', plays: [{ instante: '2026-09-28T17:00:00.000Z', tipo: 'inicial' }], tiempoRespuestaMs: 1234.6,
    transcripcion: '  una silla  ',
    comprension: {
      objetos: [{ objeto: ' silla ', identificado: true, ubicacion_reportada: ' izquierda ', ubicacion_correcta: 'si' },
                { objeto: '  ', identificado: false, ubicacion_reportada: null, ubicacion_correcta: 'no_reportada' }],
      objetos_inventados: [' televisor', ' ', ''],
      relaciones: [{ relacion: 'silla delante de mesa', respuesta: '', comprendida: 'no' }],
    },
    escalas: { claridad: 4, utilidad: null, suficiencia: null, naturalidad_voz: 5, carga_percibida: null, redundancia: null },
    criterios: {}, errores: [{ tipo: 'tecnico', descripcion: ' latencia ' }, { tipo: 'otro', descripcion: ' ' }],
    aspectosConfusos: '', comentarios: ' ok ', observaciones: '',
  })
  assert.equal(p.tiempo_respuesta_ms, 1235)
  assert.equal(p.respuesta_transcrita, 'una silla')
  assert.deepEqual(p.comprension.objetos.map((o) => [o.objeto, o.ubicacion_reportada]), [['silla', 'izquierda']])
  assert.deepEqual(p.comprension.objetos_inventados, ['televisor'])
  assert.equal(p.comprension.relaciones[0].respuesta, null)
  assert.deepEqual(p.escalas, { claridad: 4, naturalidad_voz: 5 })
  assert.deepEqual(p.errores, [{ tipo: 'tecnico', descripcion: 'latencia' }])
  assert.equal(p.comentarios, 'ok')
  assert.ok(!('aspectos_confusos' in p) && !('criterios' in p) && !('observaciones' in p))
  assert.equal(p.audio_narrativa_base64, 'AAA=')
})
await check('no se guarda sin detección, sin audio (formal) o sin reproducir', () => {
  const base = { requiereEstimulo: true, modo: 'formal', hasExecution: true, audioAvailable: true, plays: 1 }
  assert.deepEqual(m.saveBlockers(base), [])
  assert.equal(m.saveBlockers({ ...base, hasExecution: false }).length, 1)
  assert.equal(m.saveBlockers({ ...base, audioAvailable: false }).length, 1)
  assert.equal(m.saveBlockers({ ...base, plays: 0 }).length, 1)
  assert.deepEqual(m.saveBlockers({ ...base, requiereEstimulo: false, hasExecution: false }), [])
})
await check('decisión: el cliente envía solo la alternativa elegida (nunca la esperada)', () => {
  const p = m.buildResponsePayload({
    pruebaId: 'X', modo: 'ensayo', plays: [], tiempoRespuestaMs: null, transcripcion: '', comprension: { objetos: [], objetos_inventados: [], relaciones: [] },
    decision: { seleccionada: 'izquierda', coincide_con_narrativa: true }, escalas: m.EMPTY_ESCALAS, criterios: {}, errores: [],
    aspectosConfusos: '', comentarios: '', observaciones: '',
  })
  assert.deepEqual(p.decision, { seleccionada: 'izquierda', coincide_con_narrativa: true })
  assert.ok(!('ruta' in p) && !JSON.stringify(p).includes('esperada'))
})

// ── Consentimiento: texto adaptado y .docx descargable ──
const loadTs = async (rel) => {
  const code = ts.transpileModule(readFileSync(new URL(rel, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const f = join(mkdtempSync(join(tmpdir(), 'study-')), rel.split('/').pop().replace('.ts', '.mjs'))
  writeFileSync(f, code)
  return import('file://' + f.replace(/\\/g, '/'))
}
const consent = await loadTs('lib/consent.ts')
const docx = await loadTs('lib/docx.ts')
const unzip = (buf) => {
  const b = Buffer.from(buf)
  const end = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const n = b.readUInt16LE(end + 10)
  let p = b.readUInt32LE(end + 16)
  const out = {}
  for (let i = 0; i < n; i++) {
    assert.equal(b.readUInt32LE(p), 0x02014b50)
    const crc = b.readUInt32LE(p + 16), size = b.readUInt32LE(p + 24), nl = b.readUInt16LE(p + 28), off = b.readUInt32LE(p + 42)
    const name = b.subarray(p + 46, p + 46 + nl).toString()
    const lnl = b.readUInt16LE(off + 26), lex = b.readUInt16LE(off + 28)
    const data = b.subarray(off + 30 + lnl + lex, off + 30 + lnl + lex + size)
    assert.equal(zlib.crc32(data), crc, `CRC de ${name}`)
    out[name] = data.toString('utf8')
    p += 46 + nl + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32)
  }
  return out
}
await check('consentimiento: un documento por tipo de participante, igual al del backend', () => {
  const docs = consent.CONSENT_DOCUMENTS
  assert.deepEqual(Object.keys(docs).sort(), ['objetivo', 'piloto'])
  // Mismas versiones que app/routes/study.py (CONSENT_VERSIONS).
  assert.equal(docs.piloto.version, 'CI-VisionNav-Piloto v0.3')
  assert.equal(docs.objetivo.version, 'CI-VisionNav-Objetivo v0.3')
  assert.deepEqual(consent.CONSENT_KEYS, ['acepta_participar', 'puede_detenerse', 'autoriza_grabacion', 'autoriza_uso_academico'])
  for (const [tipo, d] of Object.entries(docs)) {
    const text = JSON.stringify(d.bloques)
    for (const k of consent.CONSENT_KEYS) assert.ok(text.includes(d.afirmaciones[k]), `${tipo}: afirmación ${k} en el texto`)
    for (const s of ['No se realizará grabación de video', 'implica autorizar la grabación', '[PENDIENTE'])
      assert.ok(text.includes(s), `${tipo}: ${s}`)
    // Erratas del v0.3 corregidas en el texto que se lee.
    for (const s of ['de el participante', 'a él investigadora', 'se solicitarán el nombre', 'no se utilizarán como'])
      assert.ok(!text.includes(s), `${tipo}: ${s}`)
    // Lo que se descarga es el documento real del investigador.
    for (const f of Object.values(d.archivos)) assert.ok(statSync(new URL(`public${f}`, root)).size > 10_000, f)
  }
  assert.ok(JSON.stringify(docs.objetivo.bloques).includes('ceguera total'))
  assert.ok(JSON.stringify(docs.piloto.bloques).includes('prueba piloto'))
  // El asistente ya no muestra el aviso de borrador ni pide modalidad o referencia del formato.
  const wizard = readFileSync(new URL('components/study/session-wizard.tsx', root), 'utf8')
  for (const s of ['Borrador pendiente', 'Modalidad del consentimiento', 'Referencia del formato', 'Sugerir código', 'Investigador (iniciales'])
    assert.ok(!wizard.includes(s), s)
  assert.match(wizard, /CONSENT_DOCUMENTS/)
  assert.match(wizard, /grabacion_consentimiento/)
})
const obj01Ref = { id: 'OBJ-01', pista: 'objetivo', tipo: 'imagen', estado_estimulos: 'por_definir', ejecutable_formal: false, requiere_estimulo: true }
await check('piloto: las actividades con audio se ejecutan como ensayo', () => {
  const r = m.executionRule(obj01Ref, 'piloto', false)
  assert.deepEqual([r.formal, r.ensayo], [false, true])
})

// ── Comprobaciones estáticas del código del cliente ──
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) ? [p] : []
  })
const rootPath = new URL('.', root).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const sources = ['app', 'components', 'hooks', 'lib'].flatMap((d) => walk(join(rootPath, d)))
const read = (p) => readFileSync(p, 'utf8')

await check('la clave del investigador nunca va en NEXT_PUBLIC_*', () => {
  for (const p of sources) {
    const txt = read(p)
    assert.ok(!/NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/.test(txt), p)
  }
  for (const env of ['.env.example', '.env.local']) {
    let txt = ''
    try { txt = readFileSync(join(rootPath, env), 'utf8') } catch { continue }
    assert.ok(!/NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/.test(txt), env)
  }
  const client = read(join(rootPath, 'lib', 'api-client.ts'))
  assert.match(client, /sessionStorage/)
  assert.match(client, /headers\.set\('X-API-Key', key\)/)
})
await check('el catálogo de pruebas no está duplicado en el cliente', () => {
  const studyFiles = sources.filter((p) => /study|catalog/.test(p))
  for (const p of studyFiles) {
    const txt = read(p).replace(/^\s*\/\/.*$/gm, '')
    assert.ok(!/['"`](OBJ|PIL)-0\d['"`]/.test(txt), `id de prueba fijo en ${p}`)
    assert.ok(!/guion_investigador\s*:/.test(txt) || p.endsWith('use-catalog.ts'), `guion fijo en ${p}`)
  }
  assert.throws(() => statSync(join(rootPath, 'lib', 'study-tests.ts')))
})
await check('formularios del estudio: cada input/select/textarea con etiqueta', () => {
  const formFiles = sources.filter((x) => /[\\/]components[\\/]study[\\/]/.test(x) || x.includes('study-tab'))
  assert.ok(formFiles.length >= 8, `solo ${formFiles.length} archivos del estudio`)
  for (const p of formFiles) {
    const txt = read(p)
    const controls = (txt.match(/<(input|select|textarea)\b/g) ?? []).length
    const labelled = (txt.match(/htmlFor=|<label\b|aria-label=/g) ?? []).length
    assert.ok(labelled >= Math.min(controls, 1), `${p}: controles sin etiqueta`)
    assert.ok(!/onClick=\{[^}]*\}\s*className="[^"]*"\s*>\s*<div/.test(txt), `${p}: div clicable`)
  }
})
await check('contraste de los colores del instrumento ≥ 4.5:1 (WCAG AA)', () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const pairs = [
    ['#FFFFFF', '#4B45A8'], ['#2E2A6B', '#EEEDFE'], ['#B42318', '#FFFFFF'], ['#7A2E0E', '#FFFAEB'],
    ['#0F5C47', '#E1F5EE'], ['#FFFFFF', '#B42318'], ['#0F6E56', '#FFFFFF'],
  ]
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} sobre ${bg}: ${ratio(fg, bg).toFixed(2)}`)
})

console.log(`\n${n} verificaciones OK`)
