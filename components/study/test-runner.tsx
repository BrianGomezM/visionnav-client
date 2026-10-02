'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, ImageIcon, Lock, Plus, ScanSearch, Timer, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { DegradationNotice } from '@/components/shared/degradation-notice'
import { useDetect } from '@/hooks/use-detect'
import { fetchFrozenAudio, fetchStimulusImage, friendlyError, useStudyActions } from '@/hooks/use-study'
import type { CatalogStimulus, CatalogUserTest, FrozenAudio } from '@/hooks/use-catalog'
import { ComprehensionCoder } from '@/components/study/comprehension-coder'
import { StudyAudioPlayer } from '@/components/study/study-audio-player'
import { ResponseRecorder } from '@/components/study/participant-recorder'
import { FieldInfo } from '@/components/study/field-info'
import { TestInfo } from '@/components/study/test-info'
import { LikertField, RadioGroupField, TextAreaField, inputClass, primaryButtonClass } from '@/components/study/form-controls'
import { FIELD_HELP, SCALE_HELP } from '@/lib/study-help'
import {
  ACLARACION_OPTS,
  ANCLAS_TEXTO,
  EMPTY_ESCALAS,
  PERCEPCION_CAMBIO_OPTS,
  base64ToBytes,
  buildResponsePayload,
  executionRule,
  saveBlockers,
  sha256Hex,
  type Aclaracion,
  type Comprension,
  type Ejecucion,
  type ErrorRegistrado,
  type ExecutionRule,
  type ModoRegistro,
  type PercepcionCambio,
  type PlayEvent,
  type Sesion,
  type StudyResponseRecord,
  type TipoAclaracion,
} from '@/lib/study-protocol'
import { cn } from '@/lib/utils'

const FUENTE_ESPERADA: Record<string, string> = {
  definicion: 'diseño de la escena',
  fixture_tecnico: 'fixture técnico (solo PTEST, no es evidencia)',
  no_definida: 'no definida',
}

const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? 'no evaluable' : v ? 'sí' : 'no')

/**
 * Voz del estudio (decisión del investigador del 2026-09-29): Azure Speech, Salomé (es-CO).
 * Solo se usa al generar una narrativa en un ENSAYO; las pruebas formales reproducen el
 * audio congelado (scripts/study/freeze_study_audio.py del backend).
 */
export const STUDY_TTS_MODEL = 'azure:es-CO-SalomeNeural'

const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} s`)

type StepId = 'audio' | 'respuesta' | 'notas'
const STEP_LABEL: Record<StepId, string> = { audio: 'Escena y audio', respuesta: 'Respuesta', notas: 'Notas y guardar' }

/** Lo que escuchó el participante: audio congelado o, solo en ensayos, generado en la sesión. */
interface Heard {
  origen: 'congelado' | 'generado_en_sesion'
  ejecucion: Ejecucion
  audioBase64: string | null
}

/**
 * Ejecución de UNA prueba del catálogo dentro de una sesión, por pasos:
 *   1. Escena y audio: en una prueba formal se carga el audio CONGELADO de la escena
 *      asignada (todos escuchan el mismo archivo); en un ensayo puede generarse en vivo.
 *   2. Respuesta: transcripción y solo la codificación que la prueba pregunta
 *      (catálogo → codificacion), decisión, cambio percibido o criterios 1–5.
 *   3. Notas y guardar: comentarios del participante, observaciones e incidencias.
 * La barra fija tiene la grabación, «Respuesta iniciada» (tiempo de respuesta) y el
 * contador de aclaraciones. Con `practice` se ejecuta la escena de práctica como ensayo.
 */
export function TestRunner({
  baseUrl,
  sesion,
  test,
  stimuli,
  usedStimuli,
  onSaved,
  onNext,
  practice = false,
}: {
  baseUrl: string
  sesion: Sesion
  test: CatalogUserTest
  stimuli: CatalogStimulus[]
  usedStimuli: Set<string>
  onSaved: (r: StudyResponseRecord) => void
  onNext: () => void
  practice?: boolean
}) {
  const uid = useId()
  const rule: ExecutionRule = practice
    ? { formal: false, ensayo: true, motivo: null }
    : executionRule(test, sesion.tipo_participante, sesion.es_prueba_tecnica)
  const [modo, setModo] = useState<ModoRegistro | null>(rule.formal ? 'formal' : rule.ensayo ? 'ensayo' : null)
  const actions = useStudyActions(baseUrl)
  // Umbral null: el servidor aplica el congelado (0.35), no el de Ajustes.
  const detect = useDetect({ baseUrl, confidenceThreshold: null, ttsModel: STUDY_TTS_MODEL })
  const cod = test.codificacion ?? []
  const codesComprehension = cod.some((c) => c !== 'cambio')

  const steps: StepId[] = test.requiere_estimulo ? ['audio', 'respuesta', 'notas'] : ['respuesta', 'notas']
  const [step, setStep] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const goStep = (i: number) => {
    setStep(i)
    requestAnimationFrame(() => panelRef.current?.focus())
  }

  // ── Estímulo ──
  const assigned = practice
    ? stimuli.filter((s) => s.practica).map((s) => s.stimulus_id)
    : Array.isArray(test.estimulos) ? test.estimulos : []
  const assignedStimuli = stimuli.filter((s) => assigned.includes(s.stimulus_id) && s.valido)
  const otherStimuli =
    modo === 'ensayo' && !practice ? stimuli.filter((s) => s.valido && !assigned.includes(s.stimulus_id)) : []
  const [stimulusId, setStimulusId] = useState<string | null>(null)
  const stimulus = stimuli.find((s) => s.stimulus_id === stimulusId) ?? null
  const frozen = stimulus?.audio_congelado ?? null
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingStimulus, setLoadingStimulus] = useState(false)
  const [stimulusError, setStimulusError] = useState<string | null>(null)

  // ── Lo escuchado, reproducciones y tiempos ──
  const [heard, setHeard] = useState<Heard | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [plays, setPlays] = useState<PlayEvent[]>([])
  const lastEndedRef = useRef<number | null>(null)
  const [audioEnded, setAudioEnded] = useState(false)
  const [tiempoMs, setTiempoMs] = useState<number | null>(null)
  const [serverMs, setServerMs] = useState<number | null>(null)
  const [aclaraciones, setAclaraciones] = useState<Aclaracion[]>([])
  const [tipoAclaracion, setTipoAclaracion] = useState<TipoAclaracion>('pregunta')

  // ── Respuesta ──
  const [transcripcion, setTranscripcion] = useState('')
  const [comprension, setComprension] = useState<Comprension>({ objetos: [], objetos_inventados: [], relaciones: [] })
  // Decisión (tipo C): la alternativa esperada NUNCA llega al cliente; la aplica el servidor.
  const decisionDef = test.decision ?? null
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [cambio, setCambio] = useState<PercepcionCambio | null>(null)
  const fixtureFor = (sid: string) =>
    sesion.es_prueba_tecnica && modo === 'ensayo'
      ? decisionDef?.fixtures_tecnicos.find((f) => f.stimulus_id === sid) ?? null
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

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (saved) savedRef.current?.focus()
  }, [saved])

  const resetExecution = useCallback(() => {
    detect.reset()
    setHeard(null)
    setAudioError(null)
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
    // Con audio congelado, se carga solo: el investigador solo pulsa «Reproducir».
    if (s.audio_congelado) await loadFrozen(s.audio_congelado)
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

  /** Audio congelado: se descarga, se verifica su sha256 y se reproduce tal cual. */
  const loadFrozen = async (fz: FrozenAudio | null = frozen) => {
    if (!fz) return
    resetExecution()
    setLoadingAudio(true)
    try {
      const b64 = await fetchFrozenAudio(baseUrl, fz.audio_url, fz.sha256)
      setHeard({
        origen: 'congelado',
        audioBase64: b64,
        ejecucion: {
          request_id: null,
          narrativa_final: fz.narrativa_final,
          escenario: null,
          degradaciones: [],
          umbral_confianza: 0.35,
          tts_modelo: fz.tts_modelo,
          audio: { disponible: true, content_type: fz.content_type, sha256: fz.sha256, tamano_bytes: fz.tamano_bytes },
        },
      })
    } catch (err) {
      setAudioError(friendlyError(err))
    } finally {
      setLoadingAudio(false)
    }
  }

  /** Solo en ensayos: genera narrativa y audio en vivo con /api/detect. */
  const runDetect = async () => {
    if (!file) return
    resetExecution()
    const t0 = performance.now()
    const result = await detect.detect(file)
    setServerMs(performance.now() - t0)
    if (!result) return
    const ok = Boolean(result.audio.disponible && result.audio.data_base64)
    setHeard({
      origen: 'generado_en_sesion',
      audioBase64: ok ? result.audio.data_base64! : null,
      ejecucion: {
        request_id: result.request_id ?? null,
        narrativa_final: result.narrativa_final,
        escenario: result.escenario?.tipo ?? null,
        degradaciones: result.degradaciones ?? [],
        umbral_confianza: result.metricas?.umbral_confianza ?? null,
        tts_modelo: result.metricas?.tts_modelo ?? STUDY_TTS_MODEL,
        audio: {
          disponible: result.audio.disponible,
          content_type: result.audio.content_type ?? null,
          sha256: ok ? await sha256Hex(base64ToBytes(result.audio.data_base64!)) : null,
          tamano_bytes: result.audio.tamano_bytes ?? null,
        },
      },
    })
  }

  /** Inicio de la respuesta verbal: desde el fin de la última reproducción del audio. */
  const markResponse = () => {
    if (lastEndedRef.current !== null && tiempoMs === null) setTiempoMs(performance.now() - lastEndedRef.current)
  }

  const audioOk = Boolean(heard?.audioBase64 && heard.ejecucion.audio.content_type)
  const blockers = modo
    ? [
        ...saveBlockers({
          requiereEstimulo: test.requiere_estimulo,
          modo,
          hasExecution: Boolean(heard),
          audioAvailable: audioOk,
          plays: plays.length,
        }),
        ...(modo === 'formal' && test.requiere_estimulo && heard && heard.origen !== 'congelado'
          ? ['Una prueba formal solo reproduce el audio congelado de la escena.']
          : []),
        ...(decisionDef && !seleccion ? ['Registre la alternativa que eligió el participante (o "No responde").'] : []),
        ...(cod.includes('cambio') && modo === 'formal' && !cambio ? ['Registre si el participante percibió el cambio.'] : []),
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
      ejecucion: test.requiere_estimulo && heard ? heard.ejecucion : undefined,
      // El audio congelado ya está en el servidor: no se reenvía.
      audioBase64: test.requiere_estimulo && heard?.origen === 'generado_en_sesion' ? heard.audioBase64 : null,
      plays,
      tiempoRespuestaMs: tiempoMs,
      transcripcion,
      comprension,
      codificacion: cod,
      decision: decisionDef && seleccion ? { seleccionada: seleccion, coincide_con_narrativa: null } : undefined,
      percepcionCambio: cod.includes('cambio') ? cambio : null,
      aclaraciones,
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
    const m = saved.metricas
    const d = saved.decision
    return (
      <div
        ref={savedRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-[#1D9E75]/40 bg-[#E1F5EE] p-6 space-y-3 focus:outline-none"
      >
        <p className="flex items-center gap-2 font-medium text-[#0F5C47]">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          Respuesta {saved.response_id} guardada (
          {practice ? 'práctica, no cuenta como evidencia' : saved.modo === 'formal' ? 'prueba formal' : 'ensayo, no cuenta como evidencia'})
        </p>
        {cod.includes('objetos') && (
          <p className="text-sm text-[#0F5C47]">
            Objetos identificados: {m.objetos_identificados}/{m.objetos_referencia} · inventados: {m.objetos_inventados.length}
          </p>
        )}
        {cod.includes('relaciones') && (
          <p className="text-sm text-[#0F5C47]">
            Relaciones comprendidas: {m.relaciones_comprendidas}/{m.relaciones_evaluadas}
          </p>
        )}
        {(cod.includes('ubicacion') || cod.includes('distancia')) && (
          <p className="text-sm text-[#0F5C47]">
            Ubicación coincidente: {m.ubicaciones_correctas}/{m.ubicaciones_evaluadas} · distancia coincidente:{' '}
            {m.distancias_correctas ?? 0}/{m.distancias_evaluadas ?? 0}
          </p>
        )}
        {d && (
          <p className="text-sm text-[#0F5C47]">
            Eligió <strong>{d.seleccionada}</strong> · la narrativa indicó {d.direccion_narrativa ?? '—'} (¿la siguió?{' '}
            <strong>{yesNo(d.coincide_con_narrativa)}</strong>) · según el diseño de la escena: {d.esperada ?? '—'} (¿coincide?{' '}
            <strong>{yesNo(d.correcto)}</strong>)
            {d.fuente_esperada !== 'definicion' && ` · referencia: ${FUENTE_ESPERADA[d.fuente_esperada]}`}
          </p>
        )}
        {saved.percepcion_cambio && (
          <p className="text-sm text-[#0F5C47]">
            Cambio: {PERCEPCION_CAMBIO_OPTS.find(([k]) => k === saved.percepcion_cambio)?.[1]}
          </p>
        )}
        {test.requiere_estimulo && (
          <p className="text-sm text-[#0F5C47]">
            Repeticiones: {m.repeticiones_audio} · aclaraciones: {m.aclaraciones ?? 0}
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
      disabled={loadingStimulus || detect.isLoading || loadingAudio || !s.valido}
      onClick={() => selectCatalogStimulus(s)}
      className={stimulusId === s.stimulus_id ? primaryButtonClass : undefined}
    >
      {s.stimulus_id}
      {s.audio_congelado && <Lock className="w-3 h-3 ml-1" aria-label="con audio congelado" />}
      {usedStimuli.has(s.stimulus_id) && <span className="text-xs ml-1">(ya usado)</span>}
      {fixtureFor(s.stimulus_id) && <span className="text-xs ml-1">(fixture técnico {fixtureFor(s.stimulus_id)!.id})</span>}
    </Button>
  )
  // En vivo solo en ensayos sin audio congelado (la práctica también usa el congelado).
  const canGenerateLive = modo === 'ensayo' && !practice && !frozen && Boolean(file)

  return (
    <section aria-labelledby={`${uid}-title`} className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6 pb-4 space-y-4">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 id={`${uid}-title`} className="font-medium text-foreground">
                {practice ? 'Práctica (familiarización)' : `${test.id} · ${test.nombre}`}
              </h3>
              {practice && <FieldInfo help={FIELD_HELP.practica} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {practice
                ? 'Escena distinta de las evaluadas. Use la pregunta de OBJ-01 para que el participante conozca la voz y el formato. No es evidencia.'
                : test.objetivo}
            </p>
          </div>
          {!practice && <TestInfo test={test} rule={rule} done={false} />}
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
              autoSelected.current = false
            }}
          />
        )}
      </div>

      {modo && (
        <>
          {/* ── Barra fija: pasos, grabación, respuesta iniciada y aclaraciones ── */}
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
              {canRecord && (
                <div className="flex items-center">
                  <ResponseRecorder onStart={() => undefined} onChange={setRecording} />
                  <FieldInfo help={FIELD_HELP.grabacion} />
                </div>
              )}
              {test.requiere_estimulo && (
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markResponse}
                    disabled={!audioEnded || tiempoMs !== null}
                    className="gap-2"
                  >
                    <Timer className="w-4 h-4" aria-hidden="true" /> Respuesta iniciada
                  </Button>
                  <FieldInfo help={FIELD_HELP.respuesta_iniciada} />
                  <span className="text-xs text-muted-foreground ml-2" aria-live="polite">
                    {tiempoMs !== null ? `Tiempo: ${secs(tiempoMs)}` : audioEnded ? 'Púlselo cuando el participante empiece a responder' : 'Tras el audio'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <label htmlFor={`${uid}-acl`} className="sr-only">
                  Tipo de aclaración
                </label>
                <select
                  id={`${uid}-acl`}
                  className={cn(inputClass, 'h-8 py-0 w-auto')}
                  value={tipoAclaracion}
                  onChange={(e) => setTipoAclaracion(e.target.value as TipoAclaracion)}
                >
                  {ACLARACION_OPTS.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setAclaraciones((a) => [...a, { instante: new Date().toISOString(), tipo: tipoAclaracion }])}
                >
                  <HelpCircle className="w-4 h-4" aria-hidden="true" /> Aclaración ({aclaraciones.length})
                </Button>
                <FieldInfo help={FIELD_HELP.aclaraciones} />
              </div>
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
            {/* ── 1. Escena y audio (el reproductor se mantiene montado entre pasos) ──
                 Orden pensado para el investigador: primero el reproductor y la narrativa
                 (lo que se usa en cada prueba); la imagen, que el participante no ve, plegada. */}
            {test.requiere_estimulo && (
              <div hidden={current !== 'audio'} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {practice ? 'Escena de práctica:' : assignedStimuli.length ? 'Escena asignada:' : 'Escena (ensayo):'}
                  </span>
                  {assignedStimuli.map(stimulusButton)}
                  {assignedStimuli.length === 0 && otherStimuli.length === 0 && (
                    <span className="text-muted-foreground">No hay estímulos válidos disponibles.</span>
                  )}
                  <FieldInfo help={FIELD_HELP.estimulo} />
                </div>
                {(loadingStimulus || loadingAudio) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Spinner className="w-4 h-4" /> Cargando la escena y su audio…
                  </p>
                )}
                {stimulusError && <ErrorCard message={stimulusError} />}
                {detect.error && <ErrorCard message={detect.error} />}
                {audioError && <ErrorCard message={audioError} />}
                {modo === 'formal' && stimulusId && !frozen && (
                  <ErrorCard message="Esta escena no tiene audio congelado: no puede registrarse como prueba formal. Genere el conjunto con scripts/study/freeze_study_audio.py en el backend." />
                )}
                <p role="status" aria-live="polite" className="sr-only">
                  {detect.isLoading || loadingAudio ? 'Cargando el audio.' : heard ? 'Narrativa y audio listos.' : ''}
                </p>

                {heard && (
                  <div className="space-y-3">
                    {detect.data && heard.origen === 'generado_en_sesion' && (
                      <DegradationNotice codes={detect.data.degradaciones} requestId={detect.data.request_id} />
                    )}
                    {audioOk ? (
                      <div className="flex items-start">
                        <div className="flex-1">
                          <StudyAudioPlayer
                            audioBase64={heard.audioBase64!}
                            contentType={heard.ejecucion.audio.content_type!}
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
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">
                        Narrativa (solo la ve el investigador) ·{' '}
                        {heard.origen === 'congelado' ? 'audio congelado, sha256 verificado' : 'generada en esta sesión (ensayo)'}
                      </p>
                      <p className="text-foreground">{heard.ejecucion.narrativa_final}</p>
                    </div>
                    {heard.origen === 'generado_en_sesion' && (
                      <p className="text-xs text-muted-foreground">
                        Generación: {secs(serverMs)} en total · voz (TTS) {secs(detect.data?.metricas?.tts_ms)} · detección y texto{' '}
                        {secs(detect.data?.metricas?.total_ms)}
                        <FieldInfo help={FIELD_HELP.tiempo_tts} />
                      </p>
                    )}
                  </div>
                )}

                {stimulusId && frozen && !heard && !loadingAudio && (
                  <div className="flex items-center gap-1">
                    <Button onClick={() => loadFrozen()} className={cn('flex-1 gap-2', primaryButtonClass)}>
                      <Lock className="w-4 h-4" aria-hidden="true" /> Cargar el audio congelado de la escena
                    </Button>
                    <FieldInfo help={FIELD_HELP.audio_congelado} />
                  </div>
                )}
                {canGenerateLive && (
                  <Button
                    onClick={runDetect}
                    disabled={!file || detect.isLoading || loadingStimulus || loadingAudio}
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
                        {heard?.origen === 'generado_en_sesion' ? 'Volver a generar en vivo (solo ensayo)' : 'Generar narrativa y audio en vivo (solo ensayo)'}
                      </>
                    )}
                  </Button>
                )}
                {modo === 'ensayo' && !practice && (
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
                {previewUrl && stimulusId && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Ver imagen del estímulo (solo investigador)</summary>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`Estímulo ${stimulusId} (vista del investigador)`}
                      className="mt-2 max-h-56 rounded-lg border border-border"
                    />
                  </details>
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
                    <ComprehensionCoder
                      value={comprension}
                      onChange={setComprension}
                      narrative={heard?.ejecucion.narrativa_final ?? null}
                      codificacion={cod}
                    />
                  </div>
                )}

                {cod.includes('cambio') && (
                  <RadioGroupField
                    legend="1. ¿Percibió el cambio respecto a la descripción anterior?"
                    name={`${uid}-cambio`}
                    options={PERCEPCION_CAMBIO_OPTS}
                    value={cambio}
                    onChange={setCambio}
                    required={modo === 'formal'}
                    info={FIELD_HELP.cambio}
                  />
                )}

                {decisionDef && (
                  <section aria-labelledby={`${uid}-dec`} className="rounded-lg border border-border p-4 space-y-3">
                    <h4 id={`${uid}-dec`} className="text-sm font-medium text-foreground">
                      {cod.includes('cambio') ? '2. ' : ''}Tarea de decisión
                      <FieldInfo help={FIELD_HELP.decision} />
                    </h4>
                    <p className="text-sm">
                      <strong>Pregunta:</strong> {decisionDef.pregunta}
                    </p>
                    <RadioGroupField
                      legend="Alternativa que eligió el participante"
                      name={`${uid}-seleccion`}
                      options={[...decisionDef.alternativas.map((a) => [a.id, a.texto] as [string, string]), ['no_responde', 'No responde']]}
                      value={seleccion}
                      onChange={setSeleccion}
                      required
                    />
                  </section>
                )}

                {test.criterios && test.criterios.length > 0 && (
                  <fieldset className="rounded-lg border border-border p-4">
                    <legend className="text-sm font-medium px-1">
                      Criterios de la prueba (1–5)
                      <FieldInfo help={FIELD_HELP.criterios} />
                    </legend>
                    <p className="text-xs text-muted-foreground">Lea siempre las cinco opciones: {ANCLAS_TEXTO}.</p>
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
                  hint="Incluya lo que le resultó confuso y las respuestas abiertas de la prueba."
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
                    <p className="text-xs text-muted-foreground">{FIELD_HELP.errores.texto}</p>
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
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Guardar respuesta (
                      {practice ? 'práctica' : modo === 'formal' ? 'formal' : 'ensayo'})
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
