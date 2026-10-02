'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchConsentAudio, fetchStoredAudio, friendlyError } from '@/hooks/use-study'
import type { SessionDetail } from '@/hooks/use-study'
import { PERCEPCION_CAMBIO_OPTS, type StudyResponseRecord, type SummaryGroup } from '@/lib/study-protocol'

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v} %`)
const frac = (a: number | undefined, b: number | undefined, p?: number | null) =>
  b ? `${a ?? 0}/${b}${p !== undefined ? ` (${pct(p)})` : ''}` : '—'
const yn = (v: boolean | null | undefined) => (v === null || v === undefined ? '—' : v ? 'sí' : 'no')

/** Una fila por prueba: solo las columnas que esa prueba codifica tienen valor. */
function PerTestTable({ porPrueba }: { porPrueba: Record<string, SummaryGroup & { respuestas: number }> }) {
  const rows = Object.entries(porPrueba)
  if (!rows.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-sm font-medium py-2">Resumen por prueba (solo respuestas formales)</caption>
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th scope="col" className="py-2 pr-3">Prueba</th>
            <th scope="col" className="py-2 pr-3">Objetos identificados</th>
            <th scope="col" className="py-2 pr-3">Inventados</th>
            <th scope="col" className="py-2 pr-3">Relaciones</th>
            <th scope="col" className="py-2 pr-3">Ubicación</th>
            <th scope="col" className="py-2 pr-3">Distancia</th>
            <th scope="col" className="py-2 pr-3">Decisión: sigue narrativa / coincide diseño</th>
            <th scope="col" className="py-2 pr-3">Cambio</th>
            <th scope="col" className="py-2 pr-3">Criterios (mediana)</th>
            <th scope="col" className="py-2">Rep. / aclar.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, g]) => (
            <tr key={id} className="border-b border-border align-top">
              <th scope="row" className="py-2 pr-3 font-medium">{id}</th>
              <td className="py-2 pr-3">{frac(g.objetos_identificados, g.objetos_referencia, g.pct_objetos_identificados)}</td>
              <td className="py-2 pr-3">{g.objetos_referencia ? g.objetos_inventados : '—'}</td>
              <td className="py-2 pr-3">{frac(g.relaciones_comprendidas, g.relaciones_evaluadas, g.pct_relaciones_comprendidas)}</td>
              <td className="py-2 pr-3">{frac(g.ubicaciones_correctas, g.ubicaciones_evaluadas, g.pct_ubicaciones_correctas)}</td>
              <td className="py-2 pr-3">{frac(g.distancias_correctas, g.distancias_evaluadas)}</td>
              <td className="py-2 pr-3">
                {g.decisiones_registradas
                  ? `${g.decisiones_siguen_narrativa}/${g.decisiones_registradas - g.decisiones_sin_respuesta} · ${g.decisiones_coinciden_diseno}/${g.decisiones_registradas - g.decisiones_sin_respuesta}` +
                    (g.decisiones_sin_respuesta ? ` (sin respuesta: ${g.decisiones_sin_respuesta})` : '')
                  : '—'}
              </td>
              <td className="py-2 pr-3 text-xs">
                {Object.entries(g.percepcion_cambio ?? {})
                  .map(([k, v]) => `${PERCEPCION_CAMBIO_OPTS.find(([o]) => o === k)?.[1] ?? k}: ${v}`)
                  .join(' · ') || '—'}
              </td>
              <td className="py-2 pr-3 text-xs">
                {Object.entries(g.criterios ?? {})
                  .map(([k, c]) => `${k}: ${c.mediana}`)
                  .join(' · ') || '—'}
              </td>
              <td className="py-2">
                {g.repeticiones_audio} / {g.aclaraciones}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StoredAudio({ baseUrl, sessionId, r, tipo }: { baseUrl: string; sessionId: string; r: StudyResponseRecord; tipo: 'narrativa' | 'participante' }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const label = tipo === 'narrativa' ? 'audio de la narrativa' : 'grabación del participante'
  if (url) return <audio controls src={url} aria-label={`${r.response_id}: ${label}`} className="h-8" />
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            setUrl(await fetchStoredAudio(baseUrl, sessionId, r.response_id, tipo))
          } catch (e) {
            setError(friendlyError(e))
          }
        }}
      >
        Escuchar {label}
      </Button>
      {error && <span role="alert" className="text-xs text-[#B42318]">{error}</span>}
    </span>
  )
}

/** Consentimiento registrado: documento, afirmaciones y grabación de su lectura. */
function ConsentSummary({ baseUrl, detail }: { baseUrl: string; detail: SessionDetail }) {
  const { sesion } = detail
  const c = sesion.consentimiento
  const g = c.grabacion ?? null
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="rounded-lg border border-border p-3 text-sm space-y-1">
      <p>
        <span className="text-muted-foreground">Consentimiento: </span>
        {c.version ?? c.formato_referencia ?? 'formato anterior'} · otorgado el {new Date(c.registrado_en).toLocaleString('es-CO')}
        {c.version ? ' · las 4 afirmaciones respondidas «sí»' : ''}
      </p>
      {g ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Grabación de la lectura:</span>
          {g.duracion_s !== null && <span>{Math.floor(g.duracion_s / 60)} min {Math.round(g.duracion_s % 60)} s</span>}
          {g.almacenada ? (
            url ? (
              <audio controls src={url} aria-label="Grabación del consentimiento" className="h-8" />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    setUrl(await fetchConsentAudio(baseUrl, sesion.session_id))
                  } catch (e) {
                    setError(friendlyError(e))
                  }
                }}
              >
                Escuchar
              </Button>
            )
          ) : (
            <span>no almacenada (prueba técnica sin DATA_ROOT; solo se guarda su huella)</span>
          )}
          {error && <span role="alert" className="text-xs text-[#B42318]">{error}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sesión del formato anterior: sin grabación del consentimiento.</p>
      )}
    </div>
  )
}

/** Resultados recuperados del servidor: resumen descriptivo + una fila por respuesta. */
export function SessionResults({ baseUrl, detail }: { baseUrl: string; detail: SessionDetail }) {
  const { sesion, respuestas, resumen } = detail
  return (
    <section aria-labelledby="results-title" className="space-y-4">
      <h3 id="results-title" className="font-medium">
        Resultados de {sesion.codigo} {sesion.estado === 'finalizada' ? '(sesión finalizada)' : '(en curso)'}
      </h3>
      <ConsentSummary baseUrl={baseUrl} detail={detail} />
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {(
          [
            ['Respuestas formales', resumen.respuestas_formales],
            ['Ensayos y práctica', resumen.respuestas_ensayo],
            ['Duración de la sesión', resumen.duracion_sesion_min == null ? '—' : `${resumen.duracion_sesion_min} min`],
            ['Repeticiones de audio / aclaraciones', `${resumen.repeticiones_audio ?? 0} / ${resumen.aclaraciones ?? 0}`],
            ['Mediana tiempo de respuesta (débil)', resumen.tiempo_respuesta_mediana_ms == null ? '—' : `${(resumen.tiempo_respuesta_mediana_ms / 1000).toFixed(1)} s`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {resumen.por_prueba && <PerTestTable porPrueba={resumen.por_prueba} />}
      <p className="text-xs text-muted-foreground">{resumen.nota}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Respuestas registradas en la sesión {sesion.codigo}</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th scope="col" className="py-2 pr-3">ID</th>
              <th scope="col" className="py-2 pr-3">Prueba</th>
              <th scope="col" className="py-2 pr-3">Modo</th>
              <th scope="col" className="py-2 pr-3">Estímulo</th>
              <th scope="col" className="py-2 pr-3">Obj. / Rel.</th>
              <th scope="col" className="py-2 pr-3">Rep.</th>
              <th scope="col" className="py-2 pr-3">Decisión</th>
              <th scope="col" className="py-2 pr-3">Errores</th>
              <th scope="col" className="py-2">Audio</th>
            </tr>
          </thead>
          <tbody>
            {respuestas.map((r) => (
              <tr key={r.response_id} className="border-b border-border align-top">
                <th scope="row" className="py-2 pr-3 font-mono text-xs">{r.response_id}</th>
                <td className="py-2 pr-3">{r.prueba.id}</td>
                <td className="py-2 pr-3">{r.modo}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.estimulo?.stimulus_id ?? r.estimulo?.nombre_archivo ?? '—'}
                  {r.ejecucion?.origen_audio && <span className="block text-muted-foreground">{r.ejecucion.origen_audio === 'congelado' ? 'audio congelado' : 'audio generado'}</span>}
                </td>
                <td className="py-2 pr-3 text-xs">
                  {r.metricas.objetos_identificados}/{r.metricas.objetos_referencia} · {r.metricas.relaciones_comprendidas}/
                  {r.metricas.relaciones_evaluadas}
                </td>
                <td className="py-2 pr-3">{r.metricas.repeticiones_audio}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.decision
                    ? `${r.decision.seleccionada} · narrativa: ${r.decision.direccion_narrativa ?? '—'} (¿la sigue? ${yn(
                        r.decision.coincide_con_narrativa
                      )}) · diseño: ${r.decision.esperada ?? 'no definido'} (¿coincide? ${yn(r.decision.correcto)})${
                        r.decision.fixture_tecnico ? ` · ${r.decision.fixture_tecnico}` : ''
                      }`
                    : '—'}
                  {r.percepcion_cambio && ` · cambio: ${PERCEPCION_CAMBIO_OPTS.find(([k]) => k === r.percepcion_cambio)?.[1]}`}
                </td>
                <td className="py-2 pr-3 text-xs">
                  {[...r.errores_derivados.map((e) => `${e.tipo}: ${e.elemento}`), ...r.errores.map((e) => `${e.tipo}: ${e.descripcion}`)].join(' · ') || '—'}
                </td>
                <td className="py-2 space-y-1">
                  {r.ejecucion?.audio.archivo && <StoredAudio baseUrl={baseUrl} sessionId={sesion.session_id} r={r} tipo="narrativa" />}
                  {r.grabacion_participante && <StoredAudio baseUrl={baseUrl} sessionId={sesion.session_id} r={r} tipo="participante" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {respuestas.length === 0 && <p className="text-sm text-muted-foreground py-3">Sin respuestas registradas.</p>}
      </div>
    </section>
  )
}
