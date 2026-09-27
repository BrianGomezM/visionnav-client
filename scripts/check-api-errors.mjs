// Verificación del manejo de errores del cliente (lib/api-errors.ts) sin framework de pruebas.
// Uso: node scripts/check-api-errors.mjs
// Transpila el módulo con el TypeScript del proyecto y lo ejecuta contra respuestas simuladas
// con el contrato del backend: { error: { code, message, stage, request_id }, detail }.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
import ts from 'typescript'

const src = readFileSync(new URL('../lib/api-errors.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const file = join(mkdtempSync(join(tmpdir(), 'apierr-')), 'api-errors.mjs')
writeFileSync(file, js)
const m = await import('file://' + file.replace(/\\/g, '/'))

const RID = '0123456789abcdef0123456789abcdef'
const contractBody = (code, message, stage) => JSON.stringify({ error: { code, message, stage, request_id: RID }, detail: message })

let n = 0
for (const [status, code] of [[400, 'INVALID_REQUEST'], [413, 'PAYLOAD_TOO_LARGE'], [415, 'UNSUPPORTED_IMAGE'],
  [422, 'INVALID_IMAGE'], [429, 'RATE_LIMITED'], [500, 'INTERNAL_ERROR'], [502, 'TTS_PROVIDER_ERROR'],
  [503, 'MODEL_UNAVAILABLE'], [504, 'LLM_TIMEOUT']]) {
  const res = new Response(contractBody(code, `mensaje ${code}`, 'x'), { status, headers: { 'X-Request-ID': RID } })
  const info = await m.parseApiError(res)
  assert.equal(info.status, status); assert.equal(info.code, code); assert.equal(info.requestId, RID)
  assert.equal(m.formatApiError(info), `mensaje ${code} (ID de solicitud: ${RID})`)
  n++
}
// Respuesta no JSON (p. ej. un proxy con HTML): mensaje por status, sin romperse
for (const status of [413, 429, 500, 502, 503, 504]) {
  const info = await m.parseApiError(new Response('<html>Bad gateway</html>', { status }))
  assert.ok(info.message.length > 5 && !info.message.includes('<html>'))
  n++
}
// Formato previo ({detail}) sigue funcionando
const legacy = await m.parseApiError(new Response(JSON.stringify({ detail: 'Sesión no encontrada' }), { status: 404 }))
assert.equal(legacy.message, 'Sesión no encontrada'); n++
// Degradaciones declaradas (200)
const ok = new Response('{}', { status: 200, headers: { 'X-Degradacion': 'LLM_TIMEOUT,TTS_QUOTA_EXCEEDED' } })
assert.deepEqual(m.parseDegradations(ok), ['LLM_TIMEOUT', 'TTS_QUOTA_EXCEEDED'])
assert.ok(m.degradationLabel('TTS_QUOTA_EXCEEDED').startsWith('Sin audio')); n++
assert.deepEqual(m.parseDegradations(new Response('{}')), []); n++
console.log(`OK: ${n} comprobaciones de manejo de errores del cliente`)
