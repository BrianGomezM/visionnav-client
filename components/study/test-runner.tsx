'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, ImageIcon, Lock, Pencil, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { DegradationNotice } from '@/components/shared/degradation-notice'
import { useDetect } from '@/hooks/use-detect'
import { fetchFrozenAudio, fetchStimulusImage, friendlyError, useStudyActions } from '@/hooks/use-study'
import type { CatalogStimulus, CatalogUserTest, FrozenAudio } from '@/hooks/use-catalog'
import { StudyAudioPlayer } from '@/components/study/study-audio-player'
import { ResponseRecorder } from '@/components/study/participant-recorder'
import { ReferenceCoder } from '@/components/study/reference-coder'
import { FieldInfo } from '@/components/study/field-info'
import { TestInfo } from '@/components/study/test-info'
import { LikertField, RadioGroupField, inputClass, primaryButtonClass } from '@/components/study/form-controls'
import { FIELD_HELP, SCALE_HELP } from '@/lib/study-help'
import {
  ACLARACION_OPTS,
  ANCLAS_TEXTO,
  EMPTY_ESCALAS,
  base64ToBytes,
  buildResponsePayload,
  executionRule,
  saveBlockers,
  sha256Hex,
  type Aclaracion,
  type Ejecucion,
  type ExecutionRule,
  type ModoRegistro,
  type PlayEvent,
  type Sesion,
  type StudyResponseRecord,
  type TipoAclaracion,
} from '@/lib/study-protocol'
import { EMPTY_CODING, LADO_TEXTO, codingBlockers, codingFromRecord, codingToPayload, type CodingState } from '@/lib/study-coding'
import { cn } from '@/lib/utils'

const DIR_TEXTO: Record<string, string> = { izquierda: 'izquierda', frente: 'al frente', derecha: 'derecha', no_responde: 'no responde' }
const dirs = (xs: string[] | null | undefined) => (xs?.length ? xs.map((x) => DIR_TEXTO[x] ?? x).join(', ') : '—')
const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? 'no evaluable' : v ? 'sí' : 'no')

/**
 * Voz del estudio (decisión del investigador del 2026-09-29): Azure Speech, Salomé (es-CO).
 * Solo se usa al generar una narrativa en un ENSAYO; las pruebas formales reproducen el
 * audio congelado (scripts/study/freeze_study_audio.py del backend).
 */
export const STUDY_TTS_MODEL = 'azure:es-CO-SalomeNeural'

const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} s`)

type StepId = 'audio' | 'preguntas'
const STEP_LABEL: Record<StepId, string> = { audio: 'Audio', preguntas: 'Preguntas y guardar' }

/** Lo que escuchó el participante: audio congelado o, solo en ensayos, generado en la sesión. */
interface Heard {
  origen: 'congelado' | 'generado_en_sesion'
  ejecucion: Ejecucion
  audioBase64: string | null
}

/** Ejecución guardada → el formato que acepta el servidor (sin campos añadidos al guardar). */
function cleanEjecucion(e: NonNullable<StudyResponseRecord['ejecucion']>): Ejecucion {
  return {
    request_id: e.request_id ?? null,
    narrativa_final: e.narrativa_final,
    escenario: e.escenario ?? null,
    degradaciones: e.degradaciones ?? [],
    umbral_confianza: e.umbral_confianza ?? null,
    tts_modelo: e.tts_modelo ?? null,
    audio: { disponible: e.audio.disponible, content_type: e.audio.content_type, sha256: e.audio.sha256, tamano_bytes: e.audio.tamano_bytes },
  }
}

/**
 * Ejecución de UNA prueba del catálogo dentro de una sesión (estudio v2):
 *   1. Audio: en una prueba formal se carga el audio CONGELADO de la escena asignada (todos
 *      escuchan el mismo archivo); en un ensayo puede generarse en vivo.
 *   2. Preguntas y guardar: las preguntas de la prueba con sus respuestas definidas según la
 *      narrativa (el investigador marca; la respuesta completa queda grabada), las escalas 1–5
 *      y el botón de guardar.
 * El componente queda montado al cambiar de prueba, así que lo marcado no se pierde. Una
 * respuesta guardada se puede editar: la corrección se guarda como una versión nueva que
 * reemplaza a la anterior (el servidor conserva ambas).
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
  active = true,
  existing = null,
}: {
  baseUrl: string
  sesion: Sesion
  test: CatalogUserTest
  stimuli: CatalogStimulus[]
  usedStimuli: Set<string>
  onSaved: (r: StudyResponseRecord) => void
  onNext: () => void
  practice?: boolean
  /** false cuando la prueba está oculta (otra seleccionada): se pausa el audio. */
  active?: boolean
  /** Respuesta vigente ya guardada de esta prueba en la sesión (para verla o editarla). */
  existing?: StudyResponseRecord | null
}) {
  const uid = useId()
  const rootRef = useRef<HTMLElement>(null)
  const closed = sesion.estado !== 'en_curso'
  const rule: ExecutionRule = practice
    ? { formal: false, ensayo: true, motivo: null }
    : executionRule(test, sesion.tipo_participante, sesion.es_prueba_tecnica)
  const [modo, setModo] = useState<ModoRegistro | null>(rule.formal ? 'formal' : rule.ensayo ? 'ensayo' : null)
  const actions = useStudyActions(baseUrl)
  // Umbral null: el servidor aplica el congelado (0.35), no el de Ajustes.
  const detect = useDetect({ baseUrl, confidenceThreshold: null, ttsModel: STUDY_TTS_MODEL })
  const cod = practice ? [] : test.codificacion ?? []
  const decisionDef = practice ? null : test.decision ?? null
  const referencia = practice ? null : test.referencia ?? null

  // ── Edición de una respuesta guardada ──
  const [editing, setEditing] = useState(false)
  const editSource = editing ? existing : null

  const steps: StepId[] = test.requiere_estimulo && !editSource ? ['audio', 'preguntas'] : ['preguntas']
  const [step, setStep] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const goStep = (i: number) => {
    setStep(i)
    requestAnimationFrame(() => panelRef.current?.focus())
  }

  // Al ocultarse (se eligió otra prueba) se pausa cualquier audio que esté sonando.
  useEffect(() => {
    if (!active) rootRef.current?.querySelectorAll('audio').forEach((a) => a.pause())
  }, [active])

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

  // ── Lo escuchado y las reproducciones ──
  const [heard, setHeard] = useState<Heard | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [plays, setPlays] = useState<PlayEvent[]>([])
  const [serverMs, setServerMs] = useState<number | null>(null)
  const [aclaraciones, setAclaraciones] = useState<Aclaracion[]>([])
  const [tipoAclaracion, setTipoAclaracion] = useState<TipoAclaracion>('pregunta')

  // ── Respuesta ──
  const [coding, setCoding] = useState<CodingState>(EMPTY_CODING)
  const [criterios, setCriterios] = useState<Record<string, number | null>>({})
  const [recording, setRecording] = useState<Blob | null>(null)
  const [saved, setSaved] = useState<StudyResponseRecord | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const savedRef = useRef<HTMLDivElement>(null)
  const canRecord = sesion.grabacion.autoriza_grabacion_audio

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const startEdit = () => {
    if (!existing) return
    setCoding(codingFromRecord(existing, referencia))
    setCriterios({ ...(existing.criterios ?? {}) })
    setAclaraciones(existing.aclaraciones ?? [])
    setRecording(null)
    setSaved(null)
    setSaveNote(null)
    setStep(0)
    setEditing(true)
  }

  const resetExecution = useCallback(() => {
    detect.reset()
    setHeard(null)
    setAudioError(null)
    setPlays([])
    setServerMs(null)
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
    if (autoSelected.current || existing || !modo || !test.requiere_estimulo || assignedStimuli.length !== 1) return
    autoSelected.current = true
    void selectCatalogStimulus(assignedStimuli[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, assignedStimuli.length, existing])

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

  const audioOk = Boolean(heard?.audioBase64 && heard.ejecucion.audio.content_type)
  const effModo: ModoRegistro | null = editSource ? editSource.modo : modo
  const blockers = effModo
    ? [
        ...(editSource
          ? []
          : saveBlockers({
              requiereEstimulo: test.requiere_estimulo,
              modo: effModo,
              hasExecution: Boolean(heard),
              audioAvailable: audioOk,
              plays: plays.length,
            })),
        ...(!editSource && effModo === 'formal' && test.requiere_estimulo && heard && heard.origen !== 'congelado'
          ? ['Una prueba formal solo reproduce el audio congelado de la escena.']
          : []),
        ...(effModo === 'formal' || decisionDef ? codingBlockers(cod, referencia, coding, Boolean(decisionDef)) : []),
      ]
    : ['Esta prueba no puede ejecutarse en esta sesión.']

  const save = async () => {
    if (!effModo || blockers.length) return
    const cp = codingToPayload(cod, referencia, coding)
    const payload = buildResponsePayload({
      pruebaId: test.id,
      modo: effModo,
      estimulo: editSource
        ? (editSource.estimulo?.stimulus_id
            ? { origen: 'catalogo', stimulus_id: editSource.estimulo.stimulus_id }
            : editSource.estimulo ? { origen: 'archivo_local', nombre_archivo: editSource.estimulo.nombre_archivo } : undefined)
        : test.requiere_estimulo
          ? stimulusId
            ? { origen: 'catalogo', stimulus_id: stimulusId }
            : { origen: 'archivo_local', nombre_archivo: localFile?.name }
          : undefined,
      ejecucion: editSource ? (editSource.ejecucion ? cleanEjecucion(editSource.ejecucion) : undefined) : test.requiere_estimulo && heard ? heard.ejecucion : undefined,
      // El audio congelado ya está en el servidor: no se reenvía.
      audioBase64: !editSource && test.requiere_estimulo && heard?.origen === 'generado_en_sesion' ? heard.audioBase64 : null,
      plays: editSource ? editSource.reproducciones : plays,
      tiempoRespuestaMs: editSource ? (editSource as StudyResponseRecord & { tiempo_respuesta_ms?: number | null }).tiempo_respuesta_ms ?? null : null,
      transcripcion: '',
      comprension: cp.comprension ?? { objetos: [], objetos_inventados: [], relaciones: [] },
      codificacion: cod,
      decision: decisionDef && coding.direcciones.length ? { seleccionadas: coding.direcciones, coincide_con_narrativa: null } : undefined,
      percepcionCambio: cp.percepcion_cambio ?? null,
      cambiosPercibidos: cp.cambios_percibidos,
      cambioOtro: cp.cambio_otro,
      reemplaza: editSource?.response_id ?? null,
      aclaraciones,
      escalas: EMPTY_ESCALAS,
      criterios: Object.fromEntries(Object.entries(criterios).filter(([, v]) => v !== null)) as Record<string, number>,
      errores: [],
      aspectosConfusos: '',
      comentarios: '',
      observaciones: '',
    })
    const result = await actions.addResponse.run(sesion.session_id, payload)
    if (!result) return
    let note: string | null = null
    if (recording) {
      const up = await actions.uploadRecording.run(sesion.session_id, result.respuesta.response_id, recording)
      note = up ? 'Grabación guardada.' : `La respuesta se guardó, pero la grabación no: ${actions.uploadRecording.error ?? 'error'}`
    }
    setSaveNote(note)
    setSaved(result.respuesta)
    setEditing(false)
    onSaved(result.respuesta)
    requestAnimationFrame(() => savedRef.current?.focus())
  }

  // ─────────────────────────────────────────────
  // Respuesta guardada (recién guardada o ya registrada en la sesión)
  // ─────────────────────────────────────────────
  const shown = editing ? null : saved ?? existing
  if (shown) {
    const m = shown.metricas
    const d = shown.decision
    const rel = shown.comprension?.relaciones?.[0]
    return (
      <section ref={rootRef}>
        <div
          ref={savedRef}
          tabIndex={-1}
          role="status"
          className="rounded-xl border border-[#1D9E75]/40 bg-[#E1F5EE] p-6 space-y-3 focus:outline-none"
        >
          <p className="flex items-center gap-2 font-medium text-[#0F5C47]">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            {practice ? 'Práctica' : `${test.id} · ${test.nombre}`}: respuesta {shown.response_id} guardada
            {shown.reemplaza ? ` (corrige ${shown.reemplaza})` : ''}
            {practice ? ' — no cuenta como evidencia' : shown.modo === 'formal' ? '' : ' — ensayo, no cuenta como evidencia'}
          </p>
          {cod.includes('objetos') && (
            <p className="text-sm text-[#0F5C47]">
              Objetos que nombró: {m.objetos_identificados} de {m.objetos_referencia}
              {m.objetos_inventados.length ? ` · mencionó y no estaban: ${m.objetos_inventados.join(', ')}` : ''}
            </p>
          )}
          {rel && (
            <p className="text-sm text-[#0F5C47]">
              Pregunta de relación: respondió «{rel.respuesta ?? '—'}» · {rel.comprendida === 'si' ? 'correcto' : rel.comprendida === 'no' ? 'incorrecto' : 'sin respuesta'}
            </p>
          )}
          {cod.includes('ubicacion') && (
            <ul className="text-sm text-[#0F5C47] list-disc pl-5">
              {(shown.comprension?.objetos ?? []).map((o) => (
                <li key={o.objeto}>
                  {o.objeto}: {o.ubicacion_reportada ?? 'sin lado'} ({o.ubicacion_correcta === 'si' ? 'coincide' : o.ubicacion_correcta === 'no' ? 'no coincide' : '—'})
                  {' · '}
                  {o.distancia_reportada ?? 'sin pasos'} ({o.distancia_correcta === 'si' ? 'coincide' : o.distancia_correcta === 'no' ? 'no coincide' : '—'})
                </li>
              ))}
            </ul>
          )}
          {shown.percepcion_cambio && (
            <p className="text-sm text-[#0F5C47]">
              ¿Notó cambios? {shown.percepcion_cambio === 'no_menciona_cambio' ? 'No' : shown.percepcion_cambio === 'no_responde' ? 'No responde' : 'Sí'}
              {shown.cambios_percibidos?.length ? ` · mencionó: ${shown.cambios_percibidos.join('; ')}` : ''}
              {shown.cambio_otro ? ` · otro: ${shown.cambio_otro}` : ''}
            </p>
          )}
          {d && (
            <p className="text-sm text-[#0F5C47]">
              Dijo que podría avanzar: <strong>{dirs(d.seleccionadas ?? (d.seleccionada ? d.seleccionada.split('+') : []))}</strong> · la
              descripción indicó: {DIR_TEXTO[d.direccion_narrativa ?? ''] ?? '—'} · ¿solo las salidas libres de la escena?{' '}
              <strong>{yesNo(d.correcto)}</strong>
            </p>
          )}
          {shown.criterios && Object.keys(shown.criterios).length > 0 && (
            <p className="text-sm text-[#0F5C47]">
              {Object.entries(shown.criterios)
                .map(([k, v]) => `${SCALE_HELP[k]?.titulo ?? k}: ${v}`)
                .join(' · ')}
            </p>
          )}
          {test.requiere_estimulo && <p className="text-sm text-[#0F5C47]">Repeticiones del audio: {m.repeticiones_audio}</p>}
          {saveNote && <p className="text-sm text-[#0F5C47]">{saveNote}</p>}
          <div className="flex flex-wrap gap-2">
            {!practice && existing && (
              <Button variant="outline" onClick={startEdit} className="gap-2">
                <Pencil className="w-4 h-4" aria-hidden="true" /> Editar respuesta
              </Button>
            )}
            {!closed && (
              <Button onClick={onNext} className={primaryButtonClass}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (closed && !editing) return null

  const current = steps[Math.min(step, steps.length - 1)]
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
    </Button>
  )
  // En vivo solo en ensayos sin audio congelado (la práctica también usa el congelado).
  const canGenerateLive = modo === 'ensayo' && !practice && !frozen && Boolean(file)
  const narrativa = editSource?.ejecucion?.narrativa_final ?? heard?.ejecucion.narrativa_final ?? null

  return (
    <section ref={rootRef} aria-labelledby={`${uid}-title`} className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6 pb-4 space-y-3">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 id={`${uid}-title`} className="font-medium text-foreground">
                {practice ? 'Práctica (familiarización)' : `${test.id} · ${test.nombre}`}
                {editSource && ` — editando ${editSource.response_id}`}
              </h3>
              {practice && <FieldInfo help={FIELD_HELP.practica} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {practice
                ? 'Para que el participante conozca la voz. Pregunte: «¿Qué objetos mencionó la descripción?». No es evidencia.'
                : test.objetivo}
            </p>
          </div>
          {!practice && <TestInfo test={test} rule={rule} done={false} />}
        </div>

        {rule.motivo && !editSource && (
          <div role="note" className="flex gap-2 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {rule.motivo}{' '}
              {rule.ensayo ? 'Se registra como ENSAYO: aparte y sin contar como evidencia.' : 'No puede ejecutarse en esta sesión.'}
            </p>
          </div>
        )}
        {rule.formal && rule.ensayo && !editSource && (
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

      {effModo && (
        <>
          {/* ── Barra fija: pasos, grabación y aclaraciones ── */}
          <div className="sticky top-16 z-20 border-y border-border bg-card/95 backdrop-blur px-6 py-3 space-y-2">
            <div role="tablist" aria-label={`Pasos de ${test.id}`} className="flex flex-wrap gap-1.5">
              {steps.map((s, i) => (
                <button
                  key={s}
                  id={`${uid}-tab-${s}`}
                  type="button"
                  role="tab"
                  aria-selected={s === current}
                  aria-controls={`${uid}-panel`}
                  onClick={() => goStep(i)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
                    s === current ? 'bg-[#4B45A8] text-white' : 'bg-muted text-foreground hover:bg-[#EEEDFE]'
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
            {/* ── 1. Audio (el reproductor se mantiene montado entre pasos) ── */}
            {test.requiere_estimulo && !editSource && (
              <div hidden={current !== 'audio'} className="space-y-3">
                <p className="text-sm rounded-lg bg-[#EEEDFE] text-[#2E2A6B] p-3">
                  Diga: «Le pondré un audio. Escúchelo con atención; al terminar le haré unas preguntas.»
                </p>
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
                  <ErrorCard message="Esta escena no tiene audio congelado: no puede registrarse como prueba formal." />
                )}
                <p role="status" aria-live="polite" className="sr-only">
                  {detect.isLoading || loadingAudio ? 'Cargando el audio.' : heard ? 'Audio listo.' : ''}
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
                            onEnded={() => undefined}
                          />
                        </div>
                        <FieldInfo help={FIELD_HELP.audio} />
                      </div>
                    ) : (
                      <ErrorCard message="No hay audio del sistema para este estímulo: no lo presente al participante." />
                    )}
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Lo que dice el audio (solo lo ve el investigador)</p>
                      <p className="text-foreground">{heard.ejecucion.narrativa_final}</p>
                    </div>
                    {heard.origen === 'generado_en_sesion' && (
                      <p className="text-xs text-muted-foreground">
                        Generación: {secs(serverMs)} · voz {secs(detect.data?.metricas?.tts_ms)}
                        <FieldInfo help={FIELD_HELP.tiempo_tts} />
                      </p>
                    )}
                  </div>
                )}

                {stimulusId && frozen && !heard && !loadingAudio && (
                  <div className="flex items-center gap-1">
                    <Button onClick={() => loadFrozen()} className={cn('flex-1 gap-2', primaryButtonClass)}>
                      <Lock className="w-4 h-4" aria-hidden="true" /> Cargar el audio de la escena
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
                        Generar narrativa y audio en vivo (solo ensayo)
                      </>
                    )}
                  </Button>
                )}
                {modo === 'ensayo' && !practice && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      {assignedStimuli.length ? 'Usar otra escena o una imagen local (solo ensayo)' : 'Otras escenas o imagen local'}
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
                    <summary className="cursor-pointer text-muted-foreground">Ver imagen de la escena (solo investigador)</summary>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`Escena ${stimulusId} (vista del investigador)`}
                      className="mt-2 max-h-56 rounded-lg border border-border"
                    />
                  </details>
                )}
              </div>
            )}

            {/* ── 2. Preguntas y guardar ── */}
            {current === 'preguntas' && (
              <div className="space-y-5">
                {narrativa && (
                  <details className="text-sm rounded-lg bg-muted/30 p-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Ver lo que dijo el audio</summary>
                    <p className="mt-2 text-foreground">{narrativa}</p>
                  </details>
                )}
                {referencia?.objetos && cod.includes('objetos') && (
                  <p className="text-xs text-muted-foreground">
                    Objetos de la descripción:{' '}
                    {referencia.objetos.map((o) => `${o.nombre} (${LADO_TEXTO[o.lado]}${o.pasos !== null ? `, ${o.pasos} pasos` : ''})`).join(' · ')}
                  </p>
                )}

                {practice ? (
                  <p className="text-sm text-foreground">
                    Pregunte: «¿Qué objetos mencionó la descripción?». Si tiene dudas, explíquele de nuevo la dinámica: para eso es la práctica.
                  </p>
                ) : (
                  <ReferenceCoder codificacion={cod} referencia={referencia} decision={decisionDef} value={coding} onChange={setCoding} />
                )}

                {test.criterios && test.criterios.length > 0 && !practice && (
                  <fieldset className="rounded-lg border border-border p-4">
                    <legend className="text-sm font-medium px-1">
                      Preguntas con escala del 1 al 5
                      <FieldInfo help={FIELD_HELP.criterios} />
                    </legend>
                    <p className="text-xs text-muted-foreground">Lea siempre las opciones: {ANCLAS_TEXTO}.</p>
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

                {actions.addResponse.error && <ErrorCard message={actions.addResponse.error} />}
                {blockers.length > 0 && (
                  <ul className="text-xs text-[#7A2E0E] list-disc pl-5" aria-label="Pendiente antes de guardar">
                    {blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  {editSource && (
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancelar edición
                    </Button>
                  )}
                  <Button
                    onClick={save}
                    disabled={actions.addResponse.isLoading || blockers.length > 0}
                    className={`flex-1 gap-2 ${primaryButtonClass}`}
                  >
                    {actions.addResponse.isLoading ? (
                      <>
                        <Spinner className="w-4 h-4" /> Guardando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />{' '}
                        {editSource ? 'Guardar corrección' : `Guardar respuesta${practice ? ' (práctica)' : effModo === 'ensayo' ? ' (ensayo)' : ''}`}
                      </>
                    )}
                  </Button>
                </div>
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
