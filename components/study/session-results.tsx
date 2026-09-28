'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchStoredAudio, friendlyError } from '@/hooks/use-study'
import type { SessionDetail } from '@/hooks/use-study'
import type { StudyResponseRecord } from '@/lib/study-protocol'

const pct = (v: number | null) => (v === null ? '—' : `${v} %`)

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

/** Resultados recuperados del servidor: resumen descriptivo + una fila por respuesta. */
export function SessionResults({ baseUrl, detail }: { baseUrl: string; detail: SessionDetail }) {
  const { sesion, respuestas, resumen } = detail
  return (
    <section aria-labelledby="results-title" className="space-y-4">
      <h3 id="results-title" className="font-medium">
        Resultados de {sesion.codigo} {sesion.estado === 'finalizada' ? '(sesión finalizada)' : '(en curso)'}
      </h3>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {(
          [
            ['Respuestas formales', resumen.respuestas_formales],
            ['Ensayos', resumen.respuestas_ensayo],
            ['Objetos identificados', `${resumen.objetos_identificados}/${resumen.objetos_referencia} (${pct(resumen.pct_objetos_identificados)})`],
            ['Relaciones comprendidas', `${resumen.relaciones_comprendidas}/${resumen.relaciones_evaluadas} (${pct(resumen.pct_relaciones_comprendidas)})`],
            ['Objetos omitidos', resumen.objetos_omitidos],
            ['Objetos inventados', resumen.objetos_inventados],
            ['Repeticiones de audio', resumen.repeticiones_audio],
            ['Mediana tiempo de respuesta (débil)', resumen.tiempo_respuesta_mediana_ms === null ? '—' : `${(resumen.tiempo_respuesta_mediana_ms / 1000).toFixed(1)} s`],
            // Conteos por tipo de resultado; no se combinan en una tasa de éxito global.
            ['Decisiones (correctas / incorrectas / sin respuesta)', `${resumen.decisiones_correctas ?? 0} / ${resumen.decisiones_incorrectas ?? 0} / ${resumen.decisiones_sin_respuesta ?? 0} de ${resumen.decisiones_registradas ?? 0}`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
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
                <td className="py-2 pr-3 text-xs">{r.estimulo?.stimulus_id ?? r.estimulo?.nombre_archivo ?? '—'}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.metricas.objetos_identificados}/{r.metricas.objetos_referencia} · {r.metricas.relaciones_comprendidas}/
                  {r.metricas.relaciones_evaluadas}
                </td>
                <td className="py-2 pr-3">{r.metricas.repeticiones_audio}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.decision
                    ? `${r.decision.seleccionada} (esperada: ${r.decision.esperada ?? 'no definida'}) · ${
                        r.decision.correcto === null ? 'no evaluable' : r.decision.correcto ? 'correcta' : 'incorrecta'
                      }${r.decision.fixture_tecnico ? ` · ${r.decision.fixture_tecnico}` : ''}`
                    : '—'}
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
