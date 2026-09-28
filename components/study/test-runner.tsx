'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ImageIcon, Info, Plus, ScanSearch, Timer, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { DegradationNotice } from '@/components/shared/degradation-notice'
import { useDetect } from '@/hooks/use-detect'
import { fetchStimulusImage, friendlyError, useStudyActions } from '@/hooks/use-study'
import type { CatalogStimulus, CatalogUserTest } from '@/hooks/use-catalog'
import { ComprehensionCoder } from '@/components/study/comprehension-coder'
import { StudyAudioPlayer } from '@/components/study/study-audio-player'
import { ParticipantRecorder } from '@/components/study/participant-recorder'
import {
  LikertField,
  RadioGroupField,
  TextAreaField,
  inputClass,
  primaryButtonClass,
} from '@/components/study/form-controls'
import {
  ANCLAS_PROVISIONALES,
  EMPTY_ESCALAS,
  ESCALAS,
  base64ToBytes,
  buildResponsePayload,
  executionRule,
  saveBlockers,
  sha256Hex,
  type Comprension,
  type ErrorRegistrado,
  type Escalas,
  type ModoRegistro,
  type PlayEvent,
  type Sesion,
  type StudyResponseRecord,
} from '@/lib/study-protocol'

const FUENTE_ESPERADA: Record<string, string> = {
  definicion: 'definición de la prueba',
  fixture_tecnico: 'fixture técnico (solo PTEST, no es evidencia)',
  no_definida: 'no definida',
}

/**
 * Ejecución de UNA prueba del catálogo dentro de una sesión.
 * Flujo: estímulo → /api/detect → narrativa → audio (reproducción y repeticiones)
 * → respuesta del participante → decisión (si la prueba la define) → errores →
 * escalas → observaciones → guardar.
 */
export function TestRunner({
  baseUrl,
  sesion,
  test,
  stimuli,
  usedStimuli,
  onSaved,
  onNext,
}: {
  baseUrl: string
  sesion: Sesion
  test: CatalogUserTest
  stimuli: CatalogStimulus[]
  usedStimuli: Set<string>
  onSaved: (r: StudyResponseRecord) => void
  onNext: () => void
}) {
  const uid = useId()
  const rule = executionRule(test, sesion.tipo_participante, sesion.es_prueba_tecnica)
  const [modo, setModo] = useState<ModoRegistro | null>(rule.formal ? 'formal' : rule.ensayo ? 'ensayo' : null)
  const actions = useStudyActions(baseUrl)
  // Umbral null: el servidor aplica el congelado (0.35), no el de Ajustes.
  const detect = useDetect({ baseUrl, confidenceThreshold: null })

  // ── Estímulo ──
  const assigned = Array.isArray(test.estimulos) ? test.estimulos : []
  const stimulusOptions = modo === 'formal' ? stimuli.filter((s) => assigned.includes(s.stimulus_id)) : stimuli.filter((s) => s.valido)
  const [stimulusId, setStimulusId] = useState<string | null>(null)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingStimulus, setLoadingStimulus] = useState(false)
  const [stimulusError, setStimulusError] = useState<string | null>(null)

  // ── Ejecución y audio ──
  const [audioSha, setAudioSha] = useState<string | null>(null)
  const [plays, setPlays] = useState<PlayEvent[]>([])
  const lastEndedRef = useRef<number | null>(null)
  const [tiempoMs, setTiempoMs] = useState<number | null>(null)

  // ── Respuesta ──
  const [transcripcion, setTranscripcion] = useState('')
  const [comprension, setComprension] = useState<Comprension>({ objetos: [], objetos_inventados: [], relaciones: [] })
  // Decisión (tipo C): la alternativa esperada NUNCA llega al cliente; la aplica el servidor.
  const decisionDef = test.decision ?? null
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [coincide, setCoincide] = useState<'si' | 'no' | 'nd' | null>(null)
  const fixtureFor = (stimulus: string) =>
    sesion.es_prueba_tecnica && modo === 'ensayo'
      ? decisionDef?.fixtures_tecnicos.find((f) => f.stimulus_id === stimulus) ?? null
      : null
  const [escalas, setEscalas] = useState<Escalas>(EMPTY_ESCALAS)
  const [criterios, setCriterios] = useState<Record<string, number | null>>({})
  const [errores, setErrores] = useState<ErrorRegistrado[]>([])
  const [aspectosConfusos, setAspectosConfusos] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [recording, setRecording] = useState<Blob | null>(null)
  const [saved, setSaved] = useState<StudyResponseRecord | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const savedRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (saved) savedRef.current?.focus()
  }, [saved])

  const resetExecution = useCallback(() => {
    detect.reset()
    setAudioSha(null)
    setPlays([])
    lastEndedRef.current = null
    setTiempoMs(null)
  }, [detect])

  const selectCatalogStimulus = async (s: CatalogStimulus) => {
    if (!s.imagen_url) return
    setStimulusId(s.stimulus_id)
    setLocalFile(null)
    setStimulusError(null)
    setLoadingStimulus(true)
    resetExecution()
    try {
      const f = await fetchStimulusImage(baseUrl, s.imagen_url)
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
    } catch (err) {
      setFile(null)
      setStimulusError(friendlyError(err))
    } finally {
      setLoadingStimulus(false)
    }
  }

  const selectLocalFile = (f: File | null) => {
    setStimulusId(null)
    setLocalFile(f)
    setFile(f)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
    resetExecution()
  }

  const runDetect = async () => {
    if (!file) return
    resetExecution()
    const result = await detect.detect(file)
    if (result?.audio.disponible && result.audio.data_base64) {
      setAudioSha(await sha256Hex(base64ToBytes(result.audio.data_base64)))
    }
  }

  const markResponse = () => {
    if (lastEndedRef.current !== null) setTiempoMs(performance.now() - lastEndedRef.current)
  }

  const data = detect.data
  const audioOk = Boolean(data?.audio.disponible && data.audio.data_base64 && data.audio.content_type)
  const blockers = modo
    ? [
        ...saveBlockers({
          requiereEstimulo: test.requiere_estimulo,
          modo,
          hasExecution: Boolean(data),
          audioAvailable: audioOk,
          plays: plays.length,
        }),
        ...(decisionDef && !seleccion ? ['Registre la alternativa que eligió el participante (o "No responde").'] : []),
      ]
    : ['Esta prueba no puede ejecutarse en esta sesión.']

  const save = async () => {
    if (!modo || blockers.length) return
    const payload = buildResponsePayload({
      pruebaId: test.id,
      modo,
      estimulo: test.requiere_estimulo
        ? stimulusId
          ? { origen: 'catalogo', stimulus_id: stimulusId }
          : { origen: 'archivo_local', nombre_archivo: localFile?.name }
        : undefined,
      ejecucion:
        test.requiere_estimulo && data
          ? {
              request_id: data.request_id ?? null,
              narrativa_final: data.narrativa_final,
              escenario: data.escenario?.tipo ?? null,
              degradaciones: data.degradaciones ?? [],
              umbral_confianza: data.metricas?.umbral_confianza ?? null,
              audio: {
                disponible: data.audio.disponible,
                content_type: data.audio.content_type ?? null,
                sha256: audioSha,
                tamano_bytes: data.audio.tamano_bytes ?? null,
              },
            }
          : undefined,
      audioBase64: test.requiere_estimulo ? data?.audio.data_base64 ?? null : null,
      plays,
      tiempoRespuestaMs: tiempoMs,
      transcripcion,
      comprension,
      decision: decisionDef && seleccion
        ? { seleccionada: seleccion, coincide_con_narrativa: coincide === 'si' ? true : coincide === 'no' ? false : null }
        : undefined,
      escalas,
      criterios: Object.fromEntries(Object.entries(criterios).filter(([, v]) => v !== null)) as Record<string, number>,
      errores,
      aspectosConfusos,
      comentarios,
      observaciones,
    })
    const result = await actions.addResponse.run(sesion.session_id, payload)
    if (!result) return
    let note: string | null = null
    if (recording) {
      const up = await actions.uploadRecording.run(sesion.session_id, result.respuesta.response_id, recording)
      note = up ? 'Grabación del participante guardada.' : `La respuesta se guardó, pero la grabación no: ${actions.uploadRecording.error ?? 'error'}`
    }
    setSaveNote(note)
    setSaved(result.respuesta)
    onSaved(result.respuesta)
  }

  // ─────────────────────────────────────────────
  if (saved) {
    return (
      <div
        ref={savedRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-[#1D9E75]/40 bg-[#E1F5EE] p-6 space-y-3 focus:outline-none"
      >
        <p className="flex items-center gap-2 font-medium text-[#0F5C47]">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          Respuesta {saved.response_id} guardada ({saved.modo === 'formal' ? 'prueba formal' : 'ensayo, no cuenta como evidencia'})
        </p>
        {saved.prueba.tipo !== 'escala' && saved.prueba.tipo !== 'texto' && (
          <p className="text-sm text-[#0F5C47]">
            Objetos identificados: {saved.metricas.objetos_identificados}/{saved.metricas.objetos_referencia} · Relaciones
            comprendidas: {saved.metricas.relaciones_comprendidas}/{saved.metricas.relaciones_evaluadas} · Repeticiones:{' '}
            {saved.metricas.repeticiones_audio}
          </p>
        )}
        {saved.decision && (
          <p className="text-sm text-[#0F5C47]">
            Decisión: {saved.decision.seleccionada} · esperada: {saved.decision.esperada ?? '—'} (
            {FUENTE_ESPERADA[saved.decision.fuente_esperada]}) ·{' '}
            <strong>
              {saved.decision.correcto === null ? 'no evaluable' : saved.decision.correcto ? 'correcta' : 'incorrecta'}
            </strong>
          </p>
        )}
        {saveNote &&<p className="text-sm text-[#0F5C47]">{saveNote}</p>}
        <Button onClick={onNext} className={primaryButtonClass}>
          Siguiente prueba
        </Button>
      </div>
    )
  }

  return (
    <section aria-labelledby={`${uid}-title`} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div>
        <h3 id={`${uid}-title`} className="font-medium text-foreground">
          {test.id} · {test.nombre}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{test.objetivo}</p>
      </div>

      <div className="flex gap-2 p-3 rounded-lg bg-[#EEEDFE] text-[#2E2A6B] text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Guion del investigador:</strong> {test.guion_investigador}
        </p>
      </div>

      {/* ── Modo ── */}
      {rule.motivo && (
        <div role="note" className="flex gap-2 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            {rule.motivo}{' '}
            {rule.ensayo
              ? 'Puede ejecutarse solo como ENSAYO (sesión piloto o prueba técnica): se registra aparte y no cuenta como evidencia.'
              : 'No puede ejecutarse en esta sesión.'}
          </p>
        </div>
      )}
      {rule.formal && rule.ensayo && (
        <RadioGroupField
          legend="Modo de registro"
          name="modo"
          options={[['formal', 'Prueba formal'], ['ensayo', 'Ensayo (no cuenta como evidencia)']]}
          value={modo}
          onChange={(v) => {
            setModo(v)
            setStimulusId(null)
            setFile(null)
            setPreviewUrl(null)
            resetExecution()
          }}
        />
      )}

      {modo && (
        <>
          {/* ── Estímulo + detección ── */}
          {test.requiere_estimulo && (
            <div className="space-y-3">
              <fieldset>
                <legend className="text-sm font-medium text-foreground mb-1.5">
                  Estímulo {modo === 'formal' ? '(asignado en el catálogo)' : '(ensayo)'}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {stimulusOptions.map((s) => (
                    <Button
                      key={s.stimulus_id}
                      type="button"
                      variant={stimulusId === s.stimulus_id ? 'default' : 'outline'}
                      size="sm"
                      aria-pressed={stimulusId === s.stimulus_id}
                      disabled={loadingStimulus || detect.isLoading || !s.valido}
                      onClick={() => selectCatalogStimulus(s)}
                      className={stimulusId === s.stimulus_id ? primaryButtonClass : undefined}
                    >
                      {s.stimulus_id}
                      {usedStimuli.has(s.stimulus_id) && <span className="text-xs ml-1">(ya usado)</span>}
                      {fixtureFor(s.stimulus_id) && (
                        <span className="text-xs ml-1">(fixture técnico {fixtureFor(s.stimulus_id)!.id})</span>
                      )}
                    </Button>
                  ))}
                  {stimulusOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay estímulos válidos disponibles.</p>
                  )}
                </div>
              </fieldset>
              {modo === 'ensayo' && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Usar una imagen local (solo ensayo)</summary>
                  <div className="mt-2">
                    <ImageUploader
                      selectedFile={localFile}
                      previewUrl={localFile ? previewUrl : null}
                      onFileSelect={selectLocalFile}
                      isDisabled={detect.isLoading}
                    />
                  </div>
                </details>
              )}
              {stimulusError && <ErrorCard message={stimulusError} />}
              {previewUrl && stimulusId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`Estímulo ${stimulusId} (vista del investigador)`}
                  className="max-h-56 rounded-lg border border-border"
                />
              )}
              <Button
                onClick={runDetect}
                disabled={!file || detect.isLoading || loadingStimulus}
                variant="outline"
                className="w-full gap-2"
              >
                {detect.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4" /> Generando narrativa y audio (puede tardar hasta 3 minutos)…
                  </>
                ) : (
                  <>
                    {file ? <ScanSearch className="w-4 h-4" aria-hidden="true" /> : <ImageIcon className="w-4 h-4" aria-hidden="true" />}
                    Ejecutar detección (/api/detect)
                  </>
                )}
              </Button>
              <p role="status" aria-live="polite" className="sr-only">
                {detect.isLoading ? 'Generando narrativa y audio.' : data ? 'Narrativa y audio listos.' : ''}
              </p>
              {detect.error && <ErrorCard message={detect.error} />}

              {data && (
                <div className="space-y-3">
                  <DegradationNotice codes={data.degradaciones} requestId={data.request_id} />
                  <div className="p-3 rounded-lg bg-muted/30 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">
                      Narrativa recibida (solo para el investigador) · umbral {data.metricas?.umbral_confianza ?? '—'} · ID{' '}
                      {data.request_id ?? '—'}
                    </p>
                    <p className="text-foreground">{data.narrativa_final}</p>
                  </div>
                  {audioOk ? (
                    <StudyAudioPlayer
                      audioBase64={data.audio.data_base64!}
                      contentType={data.audio.content_type!}
                      plays={plays}
                      onPlay={(e) => setPlays((p) => [...p, e])}
                      onEnded={(at) => (lastEndedRef.current = at)}
                    />
                  ) : (
                    <ErrorCard message="No hay audio del sistema para este estímulo: no lo presente al participante. Reintente o registre la incidencia (no se admite como prueba formal)." />
                  )}
                  {plays.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button type="button" variant="outline" size="sm" onClick={markResponse} className="gap-2">
                        <Timer className="w-4 h-4" aria-hidden="true" /> Marcar inicio de la respuesta verbal
                      </Button>
                      <span className="text-xs text-muted-foreground" aria-live="polite">
                        {tiempoMs !== null
                          ? `Tiempo de respuesta: ${(tiempoMs / 1000).toFixed(1)} s (métrica débil)`
                          : 'Se mide desde el fin de la última reproducción.'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Respuesta del participante ── */}
          {(test.tipo === 'imagen' || test.tipo === 'ruta' || test.tipo === 'texto') && (
            <TextAreaField
              label={test.tipo === 'texto' ? 'Respuesta del participante' : 'Transcripción de la respuesta verbal'}
              value={transcripcion}
              onChange={setTranscripcion}
              rows={3}
              hint="Anote lo que dijo, tal cual, sin corregir."
            />
          )}

          {test.requiere_estimulo && (
            <div className="rounded-lg border border-border p-4">
              <ComprehensionCoder value={comprension} onChange={setComprension} />
            </div>
          )}

          {decisionDef && (
            <section aria-labelledby={`${uid}-dec`} className="rounded-lg border border-border p-4 space-y-3">
              <h4 id={`${uid}-dec`} className="text-sm font-medium text-foreground">Tarea de decisión</h4>
              <p className="text-xs text-muted-foreground">
                Decisión hipotética basada en la información espacial del audio: el participante no se desplaza ni
                controla ningún personaje. La alternativa esperada la aplica el servidor según la definición de la prueba.
              </p>
              <p className="text-sm">
                <strong>Pregunta:</strong> {decisionDef.pregunta}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <RadioGroupField
                  legend="Alternativa que eligió el participante"
                  name={`${uid}-seleccion`}
                  options={[...decisionDef.alternativas.map((a) => [a.id, a.texto] as [string, string]), ['no_responde', 'No responde']]}
                  value={seleccion}
                  onChange={setSeleccion}
                  required
                />
                <RadioGroupField
                  legend="¿La elección sigue lo que dijo la narrativa? (codificación del investigador)"
                  name={`${uid}-coincide`}
                  options={[['si', 'Sí'], ['no', 'No'], ['nd', 'No determinado']]}
                  value={coincide}
                  onChange={setCoincide}
                />
              </div>
              {decisionDef.estado_esperadas === 'por_definir' && !(stimulusId && fixtureFor(stimulusId)) && (
                <p className="text-xs text-muted-foreground">
                  La alternativa esperada de esta prueba está POR DEFINIR: la decisión se registra, pero no se evalúa como
                  correcta o incorrecta.
                </p>
              )}
            </section>
          )}

          {/* ── Escalas ── */}
          {test.tipo === 'escala' && test.criterios && (
            <fieldset className="rounded-lg border border-border p-4">
              <legend className="text-sm font-medium px-1">Criterios de la prueba (1–5)</legend>
              {test.criterios.map((c) => (
                <LikertField
                  key={c}
                  label={c.replace(/_/g, ' ')}
                  value={criterios[c] ?? null}
                  onChange={(v) => setCriterios((p) => ({ ...p, [c]: v }))}
                />
              ))}
            </fieldset>
          )}
          {test.requiere_estimulo && (
            <details className="rounded-lg border border-border p-4" open>
              <summary className="text-sm font-medium cursor-pointer">Valoraciones subjetivas de este audio (1–5, opcionales)</summary>
              <p className="text-xs text-muted-foreground mt-2">{ANCLAS_PROVISIONALES}</p>
              {ESCALAS.map((e) => (
                <LikertField
                  key={e.key}
                  label={e.label}
                  hint={e.ayuda}
                  value={escalas[e.key]}
                  onChange={(v) => setEscalas((p) => ({ ...p, [e.key]: v }))}
                />
              ))}
            </details>
          )}

          {/* ── Errores y observaciones ── */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Errores e incidencias adicionales</legend>
            <p className="text-xs text-muted-foreground">
              Omisiones, objetos inventados y errores de ubicación o relación se calculan a partir de la codificación.
            </p>
            {errores.map((e, i) => (
              <div key={i} className="grid sm:grid-cols-[auto_1fr_auto] gap-2 items-end">
                <div>
                  <label htmlFor={`${uid}-et${i}`} className="text-xs text-muted-foreground block">
                    Tipo
                  </label>
                  <select
                    id={`${uid}-et${i}`}
                    className={inputClass}
                    value={e.tipo}
                    onChange={(ev) =>
                      setErrores((p) => p.map((x, j) => (j === i ? { ...x, tipo: ev.target.value as ErrorRegistrado['tipo'] } : x)))
                    }
                  >
                    <option value="tecnico">Técnico</option>
                    <option value="procedimiento">Procedimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`${uid}-ed${i}`} className="text-xs text-muted-foreground block">
                    Descripción
                  </label>
                  <input
                    id={`${uid}-ed${i}`}
                    className={inputClass}
                    value={e.descripcion}
                    onChange={(ev) => setErrores((p) => p.map((x, j) => (j === i ? { ...x, descripcion: ev.target.value } : x)))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar error ${i + 1}`}
                  onClick={() => setErrores((p) => p.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setErrores((p) => [...p, { tipo: 'tecnico', descripcion: '' }])}
            >
              <Plus className="w-3 h-3" aria-hidden="true" /> Añadir error o incidencia
            </Button>
          </fieldset>

          {test.requiere_estimulo && (
            <TextAreaField label="¿Qué le resultó confuso al participante?" value={aspectosConfusos} onChange={setAspectosConfusos} rows={2} />
          )}
          <TextAreaField label="Comentarios abiertos del participante" value={comentarios} onChange={setComentarios} rows={2} />
          <TextAreaField
            label="Observaciones del investigador"
            value={observaciones}
            onChange={setObservaciones}
            rows={2}
            hint="Comportamiento, dudas, condiciones de la sesión. Sin nombres."
          />

          {sesion.grabacion.autoriza_grabacion_audio && test.requiere_estimulo && (
            <ParticipantRecorder onChange={setRecording} />
          )}

          {actions.addResponse.error && <ErrorCard message={actions.addResponse.error} />}
          {blockers.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-5" aria-label="Pendiente antes de guardar">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <Button
            onClick={save}
            disabled={actions.addResponse.isLoading || blockers.length > 0}
            className={`w-full gap-2 ${primaryButtonClass}`}
          >
            {actions.addResponse.isLoading ? (
              <>
                <Spinner className="w-4 h-4" /> Guardando…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Guardar respuesta ({modo === 'formal' ? 'formal' : 'ensayo'})
              </>
            )}
          </Button>
        </>
      )}
    </section>
  )
}
