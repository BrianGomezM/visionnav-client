'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ImageIcon, Info, Plus, ScanSearch, Timer, Trash2 } from 'lucide-react'
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
import { ResponseRecorder } from '@/components/study/participant-recorder'
import { FieldInfo } from '@/components/study/field-info'
import { TestInfo } from '@/components/study/test-info'
import { LikertField, RadioGroupField, TextAreaField, inputClass, primaryButtonClass } from '@/components/study/form-controls'
import { FIELD_HELP, SCALE_HELP } from '@/lib/study-help'
import {
  base64ToBytes,
  buildResponsePayload,
  EMPTY_ESCALAS,
  executionRule,
  saveBlockers,
  sha256Hex,
  type Comprension,
  type ErrorRegistrado,
  type ModoRegistro,
  type PlayEvent,
  type Sesion,
  type StudyResponseRecord,
} from '@/lib/study-protocol'
import { cn } from '@/lib/utils'

const FUENTE_ESPERADA: Record<string, string> = {
  definicion: 'definición de la prueba',
  fixture_tecnico: 'fixture técnico (solo PTEST, no es evidencia)',
  no_definida: 'no definida',
}

const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} s`)

type StepId = 'audio' | 'respuesta' | 'notas'
const STEP_LABEL: Record<StepId, string> = { audio: 'Escena y audio', respuesta: 'Respuesta', notas: 'Notas y guardar' }

/**
 * Ejecución de UNA prueba del catálogo dentro de una sesión, por pasos:
 *   1. Escena y audio: estímulo → /api/detect → narrativa → reproducción y repeticiones.
 *   2. Respuesta: transcripción, codificación de objetos y relaciones, decisión o criterios.
 *   3. Notas y guardar: comentarios del participante, observaciones, incidencias.
 * La barra fija tiene la grabación de la respuesta (marca el inicio de la respuesta) y
 * los tiempos. Las valoraciones subjetivas se preguntan una vez, al cerrar la sesión
 * (y en OBJ-05/06/07), no después de cada audio.
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

  const steps: StepId[] = test.requiere_estimulo ? ['audio', 'respuesta', 'notas'] : ['respuesta', 'notas']
  const [step, setStep] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const goStep = (i: number) => {
    setStep(i)
    requestAnimationFrame(() => panelRef.current?.focus())
  }

  // ── Estímulo ──
  const assigned = Array.isArray(test.estimulos) ? test.estimulos : []
  const assignedStimuli = stimuli.filter((s) => assigned.includes(s.stimulus_id) && s.valido)
  const otherStimuli = modo === 'ensayo' ? stimuli.filter((s) => s.valido && !assigned.includes(s.stimulus_id)) : []
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
  const [audioEnded, setAudioEnded] = useState(false)
  const [tiempoMs, setTiempoMs] = useState<number | null>(null)
  const [serverMs, setServerMs] = useState<number | null>(null)

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
  const [criterios, setCriterios] = useState<Record<string, number | null>>({})
  const [errores, setErrores] = useState<ErrorRegistrado[]>([])
  const [comentarios, setComentarios] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [recording, setRecording] = useState<Blob | null>(null)
  const [saved, setSaved] = useState<StudyResponseRecord | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const savedRef = useRef<HTMLDivElement>(null)
  const canRecord = sesion.grabacion.autoriza_grabacion_audio
  const codesComprehension = test.tipo === 'imagen' || test.tipo === 'ruta'

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
    setAudioEnded(false)
    setTiempoMs(null)
    setServerMs(null)
    setComprension({ objetos: [], objetos_inventados: [], relaciones: [] })
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

  // Una sola escena asignada: se carga sola (todos los participantes escuchan la misma).
  const autoSelected = useRef(false)
  useEffect(() => {
    if (autoSelected.current || !modo || !test.requiere_estimulo || assignedStimuli.length !== 1) return
    autoSelected.current = true
    void selectCatalogStimulus(assignedStimuli[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, assignedStimuli.length])

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
    const t0 = performance.now()
    const result = await detect.detect(file)
    setServerMs(performance.now() - t0)
    if (result?.audio.disponible && result.audio.data_base64) {
      setAudioSha(await sha256Hex(base64ToBytes(result.audio.data_base64)))
    }
  }

  /** Inicio de la respuesta verbal: desde el fin de la última reproducción del audio. */
  const markResponse = () => {
    if (lastEndedRef.current !== null && tiempoMs === null) setTiempoMs(performance.now() - lastEndedRef.current)
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
      escalas: EMPTY_ESCALAS,
      criterios: Object.fromEntries(Object.entries(criterios).filter(([, v]) => v !== null)) as Record<string, number>,
      errores,
      aspectosConfusos: '',
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
        {codesComprehension && (
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
        {saveNote && <p className="text-sm text-[#0F5C47]">{saveNote}</p>}
        <Button onClick={onNext} className={primaryButtonClass}>
          Siguiente prueba
        </Button>
      </div>
    )
  }

  const current = steps[step]
  const stimulusButton = (s: CatalogStimulus) => (
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
      {fixtureFor(s.stimulus_id) && <span className="text-xs ml-1">(fixture técnico {fixtureFor(s.stimulus_id)!.id})</span>}
    </Button>
  )

  return (
    <section aria-labelledby={`${uid}-title`} className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6 pb-4 space-y-4">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <h3 id={`${uid}-title`} className="font-medium text-foreground">
              {test.id} · {test.nombre}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{test.objetivo}</p>
          </div>
          <TestInfo test={test} rule={rule} done={false} />
        </div>

        <div className="flex gap-2 p-3 rounded-lg bg-[#EEEDFE] text-[#2E2A6B] text-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Guion del investigador:</strong> {test.guion_investigador}
            <FieldInfo help={FIELD_HELP.guion} />
          </p>
        </div>

        {rule.motivo && (
          <div role="note" className="flex gap-2 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {rule.motivo}{' '}
              {rule.ensayo ? 'Se registra como ENSAYO: aparte y sin contar como evidencia.' : 'No puede ejecutarse en esta sesión.'}
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
      </div>

      {modo && (
        <>
          {/* ── Barra fija: pasos, grabación y tiempos ── */}
          <div className="sticky top-16 z-20 border-y border-border bg-card/95 backdrop-blur px-6 py-3 space-y-2">
            <div role="tablist" aria-label={`Pasos de ${test.id}`} className="flex flex-wrap gap-1.5">
              {steps.map((s, i) => (
                <button
                  key={s}
                  id={`${uid}-tab-${s}`}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-controls={`${uid}-panel`}
                  onClick={() => goStep(i)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
                    i === step ? 'bg-[#4B45A8] text-white' : 'bg-muted text-foreground hover:bg-[#EEEDFE]'
                  )}
                >
                  {i + 1}. {STEP_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {canRecord ? (
                <div className="flex items-center">
                  <ResponseRecorder onStart={markResponse} onChange={setRecording} />
                  <FieldInfo help={FIELD_HELP.grabacion} />
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={markResponse} disabled={!audioEnded} className="gap-2">
                  <Timer className="w-4 h-4" aria-hidden="true" /> Marcar inicio de la respuesta
                </Button>
              )}
              {test.requiere_estimulo && (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Respuesta del participante:{' '}
                  <strong className="text-foreground">
                    {tiempoMs !== null ? secs(tiempoMs) : audioEnded ? 'pulse «Grabar» al empezar a responder' : 'tras el audio'}
                  </strong>
                  <FieldInfo help={FIELD_HELP.tiempo_respuesta} />
                </span>
              )}
            </div>
          </div>

          <div
            ref={panelRef}
            id={`${uid}-panel`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${current}`}
            tabIndex={-1}
            className="p-6 space-y-5 focus:outline-none"
          >
            {/* ── 1. Escena y audio (el reproductor se mantiene montado entre pasos) ── */}
            {test.requiere_estimulo && (
              <div hidden={current !== 'audio'} className="space-y-3">
                <fieldset>
                  <legend className="text-sm font-medium text-foreground mb-1.5">
                    {assignedStimuli.length ? 'Escena asignada a esta prueba' : 'Escena (ensayo)'}
                    <FieldInfo help={FIELD_HELP.estimulo} />
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {assignedStimuli.map(stimulusButton)}
                    {assignedStimuli.length === 0 && otherStimuli.length === 0 && (
                      <p className="text-sm text-muted-foreground">No hay estímulos válidos disponibles.</p>
                    )}
                  </div>
                </fieldset>
                {modo === 'ensayo' && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      {assignedStimuli.length ? 'Usar otra escena o una imagen local (solo ensayo)' : 'Escenas del Dataset 1 o imagen local'}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">{otherStimuli.map(stimulusButton)}</div>
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
                      <Spinner className="w-4 h-4" /> Generando narrativa y audio…
                    </>
                  ) : (
                    <>
                      {file ? <ScanSearch className="w-4 h-4" aria-hidden="true" /> : <ImageIcon className="w-4 h-4" aria-hidden="true" />}
                      {data ? 'Volver a generar la narrativa' : 'Generar narrativa y audio'}
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
                      <p className="text-xs text-muted-foreground mb-1">Narrativa (solo la ve el investigador)</p>
                      <p className="text-foreground">{data.narrativa_final}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generación: {secs(serverMs)} en total · voz (TTS) {secs(data.metricas?.tts_ms)} · detección y texto{' '}
                      {secs(data.metricas?.total_ms)}
                      <FieldInfo help={FIELD_HELP.tiempo_tts} />
                    </p>
                    {audioOk ? (
                      <div className="flex items-start">
                        <div className="flex-1">
                          <StudyAudioPlayer
                            audioBase64={data.audio.data_base64!}
                            contentType={data.audio.content_type!}
                            plays={plays}
                            onPlay={(e) => setPlays((p) => [...p, e])}
                            onEnded={(at) => {
                              lastEndedRef.current = at
                              setAudioEnded(true)
                            }}
                          />
                        </div>
                        <FieldInfo help={FIELD_HELP.audio} />
                      </div>
                    ) : (
                      <ErrorCard message="No hay audio del sistema para este estímulo: no lo presente al participante. Reintente o registre la incidencia (no se admite como prueba formal)." />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── 2. Respuesta ── */}
            {current === 'respuesta' && (
              <div className="space-y-5">
                {(test.tipo === 'imagen' || test.tipo === 'ruta' || test.tipo === 'texto') && (
                  <TextAreaField
                    label={test.tipo === 'texto' ? 'Respuesta del participante' : 'Transcripción de la respuesta verbal'}
                    value={transcripcion}
                    onChange={setTranscripcion}
                    rows={3}
                    info={test.tipo === 'texto' ? FIELD_HELP.respuesta_texto : FIELD_HELP.transcripcion}
                    hint={canRecord ? 'Opcional si la respuesta quedó grabada.' : 'Tal cual, sin corregir.'}
                  />
                )}

                {codesComprehension && (
                  <div className="rounded-lg border border-border p-4">
                    <ComprehensionCoder value={comprension} onChange={setComprension} narrative={data?.narrativa_final ?? null} />
                  </div>
                )}

                {decisionDef && (
                  <section aria-labelledby={`${uid}-dec`} className="rounded-lg border border-border p-4 space-y-3">
                    <h4 id={`${uid}-dec`} className="text-sm font-medium text-foreground">
                      Tarea de decisión
                      <FieldInfo help={FIELD_HELP.decision} />
                    </h4>
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
                        legend="¿La elección sigue lo que dijo la narrativa?"
                        name={`${uid}-coincide`}
                        options={[['si', 'Sí'], ['no', 'No'], ['nd', 'No determinado']]}
                        value={coincide}
                        onChange={setCoincide}
                        info={FIELD_HELP.coincide}
                      />
                    </div>
                  </section>
                )}

                {test.criterios && test.criterios.length > 0 && (
                  <fieldset className="rounded-lg border border-border p-4">
                    <legend className="text-sm font-medium px-1">
                      Criterios de la prueba (1–5)
                      <FieldInfo help={FIELD_HELP.criterios} />
                    </legend>
                    {test.criterios.map((c) => {
                      const h = SCALE_HELP[c]
                      return (
                        <LikertField
                          key={c}
                          label={h?.titulo ?? c.replace(/_/g, ' ')}
                          hint={h?.pregunta ? `«${h.pregunta}»` : undefined}
                          info={h}
                          value={criterios[c] ?? null}
                          onChange={(v) => setCriterios((p) => ({ ...p, [c]: v }))}
                        />
                      )
                    })}
                  </fieldset>
                )}
              </div>
            )}

            {/* ── 3. Notas y guardar ── */}
            {current === 'notas' && (
              <div className="space-y-5">
                <TextAreaField
                  label="Comentarios del participante"
                  value={comentarios}
                  onChange={setComentarios}
                  rows={2}
                  info={FIELD_HELP.comentarios}
                  hint="Incluya lo que le resultó confuso."
                />
                <TextAreaField
                  label="Observaciones del investigador"
                  value={observaciones}
                  onChange={setObservaciones}
                  rows={2}
                  info={FIELD_HELP.observaciones}
                  hint="Sin nombres."
                />
                <details className="rounded-lg border border-border p-4" open={errores.length > 0}>
                  <summary className="text-sm font-medium cursor-pointer">
                    Incidencias técnicas o de procedimiento ({errores.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {FIELD_HELP.errores.texto}
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
                          aria-label={`Quitar incidencia ${i + 1}`}
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
                      <Plus className="w-3 h-3" aria-hidden="true" /> Añadir incidencia
                    </Button>
                  </div>
                </details>

                {recording === null && canRecord && (
                  <p className="text-xs text-muted-foreground">Sin grabación de la respuesta en esta prueba (opcional).</p>
                )}
                {actions.addResponse.error && <ErrorCard message={actions.addResponse.error} />}
                {blockers.length > 0 && (
                  <ul className="text-xs text-[#7A2E0E] list-disc pl-5" aria-label="Pendiente antes de guardar">
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
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => goStep(step - 1)} disabled={step === 0} className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Anterior
              </Button>
              {step < steps.length - 1 && (
                <Button onClick={() => goStep(step + 1)} className={`gap-2 ${primaryButtonClass}`}>
                  Siguiente: {STEP_LABEL[steps[step + 1]]} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
