'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Printer, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import {
  CheckboxGroupField,
  RadioGroupField,
  TextField,
  primaryButtonClass,
} from '@/components/study/form-controls'
import {
  CEGUERA_OPTS,
  DISPOSITIVO_OPTS,
  ETAPA_OPTS,
  FRECUENCIA_OPTS,
  LECTOR_OPTS,
  REPRODUCCION_OPTS,
  SINO_OPTS,
  TECNOLOGIA_OPTS,
  TEST_CODE_RE,
  TRACK_LABEL,
  consentComplete,
  normalizeFicha,
  parseUserAgent,
  suggestNextCode,
  validateContext,
  validateParticipant,
  type Consentimiento,
  type Contexto,
  type Ficha,
  type SessionCreatePayload,
  type TipoParticipante,
} from '@/lib/study-protocol'
import { CONSENT_DOCUMENTS, CONSENT_KEYS, type ActaData, type ConsentKey } from '@/lib/consent'
import { printConsent } from '@/lib/consent-print'
import { ConsentDownloadLinks, ConsentText } from '@/components/study/consent-document'
import { AudioRecorder } from '@/components/study/participant-recorder'

const STEPS = ['Participante', 'Consentimiento', 'Confirmar'] as const

const EMPTY_FICHA: Ficha = {
  condicion_visual: { tipo_ceguera: 'congenita', etapa_adquisicion: null, experiencia_visual_previa: null },
  tecnologias: { utiliza: [], otra_descripcion: null, lectores_pantalla: [], lector_otro: null, frecuencia_uso: null },
  experiencia_descripcion_audio: 'no_informa',
}

type Answer = 'si' | 'no'
const EMPTY_ANSWERS: Record<ConsentKey, Answer | null> = {
  acepta_participar: null,
  puede_detenerse: null,
  autoriza_grabacion: null,
  autoriza_uso_academico: null,
}

const today = () => new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

const label = <T extends string>(opts: [T, string][], v: T | null | undefined) => opts.find(([k]) => k === v)?.[1] ?? '—'
const fmtDuration = (s: number | null) => (s === null ? '—' : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`)

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',', 2)[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/**
 * Registro de la sesión en 3 pasos: participante (ficha y contexto de la sesión) →
 * consentimiento (lectura grabada + 4 afirmaciones) → confirmar. No se guarda NADA en
 * el servidor hasta el último paso; el servidor rechaza la sesión sin las cuatro
 * afirmaciones o sin la grabación del consentimiento.
 */
export function SessionWizard({
  existingCodes,
  isCreating,
  error,
  onCreate,
  onCancel,
}: {
  existingCodes: string[]
  isCreating: boolean
  error: string | null
  onCreate: (payload: SessionCreatePayload) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState(0)
  const [codigo, setCodigo] = useState(() => suggestNextCode(existingCodes))
  const codeEdited = useRef(false)
  const [tipo, setTipo] = useState<TipoParticipante | null>(null)
  const [ficha, setFicha] = useState<Ficha>(EMPTY_FICHA)
  const [answers, setAnswers] = useState(EMPTY_ANSWERS)
  const [recording, setRecording] = useState<{ blob: Blob; duration: number | null } | null>(null)
  const [contexto, setContexto] = useState<Contexto>({
    dispositivo: 'computador',
    dispositivo_otro: null,
    reproduccion_audio: 'audifonos',
    reproduccion_otro: null,
    entorno_tecnico: null,
  })
  const [showErrors, setShowErrors] = useState(false)
  const [encoding, setEncoding] = useState(false)
  // Acta (§13): el nombre SOLO se usa para imprimir; nunca entra al payload ni al servidor.
  const [nombre, setNombre] = useState('')
  const [lugar, setLugar] = useState('')
  const [fecha, setFecha] = useState(today)
  const [actaImpresa, setActaImpresa] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // El código se asigna solo (siguiente libre) mientras el investigador no lo edite.
  useEffect(() => {
    if (!codeEdited.current) setCodigo(suggestNextCode(existingCodes))
  }, [existingCodes])

  useEffect(() => {
    // Entorno técnico: lo registra el navegador (no se pregunta al participante).
    setContexto((c) => ({ ...c, entorno_tecnico: parseUserAgent(navigator.userAgent, navigator.maxTouchPoints) }))
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // En piloto no hay ceguera; en objetivo no se admite "no aplica". Cada tipo tiene su
  // propio consentimiento: al cambiar de tipo se descartan respuestas y grabación.
  useEffect(() => {
    if (!tipo) return
    setFicha((f) => ({
      ...f,
      condicion_visual:
        tipo === 'piloto'
          ? { tipo_ceguera: 'no_aplica', etapa_adquisicion: null, experiencia_visual_previa: null }
          : f.condicion_visual.tipo_ceguera === 'no_aplica'
            ? { ...EMPTY_FICHA.condicion_visual }
            : f.condicion_visual,
    }))
    setAnswers(EMPTY_ANSWERS)
    setRecording(null)
    setActaImpresa(false)
  }, [tipo])

  const participantErrors = tipo ? validateParticipant(codigo, tipo, ficha) : { tipo: 'Seleccione el tipo de participante.' }
  const duplicate = existingCodes.includes(codigo)
  if (duplicate) participantErrors.codigo = 'Ese código ya tiene una sesión: recupérela desde la lista.'
  const contextErrors = validateContext(contexto)

  const doc = tipo ? CONSENT_DOCUMENTS[tipo] : null
  const consent: Consentimiento | null = doc
    ? {
        version: doc.version,
        acepta_participar: answers.acepta_participar === 'si',
        puede_detenerse: answers.puede_detenerse === 'si',
        autoriza_grabacion: answers.autoriza_grabacion === 'si',
        autoriza_uso_academico: answers.autoriza_uso_academico === 'si',
      }
    : null
  const anyNo = CONSENT_KEYS.some((k) => answers[k] === 'no')
  const yn = (k: ConsentKey) => (answers[k] === null ? null : answers[k] === 'si')
  const acta: ActaData = {
    nombre: nombre.trim(),
    codigo,
    lugar: lugar.trim(),
    fecha: fecha.trim(),
    participar: yn('acepta_participar'),
    grabacion: yn('autoriza_grabacion'),
    usoAcademico: yn('autoriza_uso_academico'),
  }
  const actaErrors: Record<string, string> = {}
  if (!acta.nombre) actaErrors.nombre = 'Escriba el nombre completo para el acta.'
  if (!acta.lugar) actaErrors.lugar = 'Indique el lugar.'
  if (!acta.fecha) actaErrors.fecha = 'Indique la fecha.'
  const imprimirActa = () => {
    if (!doc) return
    const ok = printConsent(doc, acta)
    setPopupBlocked(!ok)
    if (ok) setActaImpresa(true)
  }

  const stepValid = [
    Object.keys(participantErrors).length === 0 && Object.keys(contextErrors).length === 0,
    Boolean(consent && consentComplete(consent) && recording) && Object.keys(actaErrors).length === 0,
    true,
  ]

  const next = () => {
    if (!stepValid[step]) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const err = (e: Record<string, string>, k: string) => (showErrors ? e[k] : undefined)
  const cv = ficha.condicion_visual
  const tec = ficha.tecnologias
  const setCv = (u: Partial<Ficha['condicion_visual']>) => setFicha((f) => ({ ...f, condicion_visual: { ...f.condicion_visual, ...u } }))
  const setTec = (u: Partial<Ficha['tecnologias']>) => setFicha((f) => ({ ...f, tecnologias: { ...f.tecnologias, ...u } }))

  const submit = async () => {
    if (!tipo || !consent || !recording) return
    setEncoding(true)
    try {
      onCreate({
        codigo,
        tipo_participante: tipo,
        ficha: normalizeFicha(ficha),
        contexto: {
          ...contexto,
          dispositivo_otro: contexto.dispositivo === 'otro' ? contexto.dispositivo_otro : null,
          reproduccion_otro: contexto.reproduccion_audio === 'otro' ? contexto.reproduccion_otro : null,
        },
        consentimiento: consent,
        grabacion_consentimiento: {
          content_type: recording.blob.type || 'audio/webm',
          data_base64: await blobToBase64(recording.blob),
          duracion_s: recording.duration,
        },
      })
    } finally {
      setEncoding(false)
    }
  }

  const lectoresUsados = tec.lectores_pantalla.filter((l) => l !== 'no_utiliza')

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5" aria-labelledby="wizard-title">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 id="wizard-title" className="font-medium text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#4B45A8]" aria-hidden="true" />
          Nueva sesión
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <nav aria-label="Pasos del registro">
        <ol className="flex flex-wrap gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? 'step' : undefined}
              className={
                i === step
                  ? 'px-2 py-1 rounded-full bg-[#4B45A8] text-white'
                  : i < step
                    ? 'px-2 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56]'
                    : 'px-2 py-1 rounded-full bg-muted text-muted-foreground'
              }
            >
              {i + 1}. {s}
              {i < step && <span className="sr-only"> (completado)</span>}
            </li>
          ))}
        </ol>
      </nav>

      <h4 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground focus:outline-none">
        Paso {step + 1} de {STEPS.length}: {STEPS[step]}
      </h4>

      {/* ── Paso 1: participante, ficha mínima y contexto de la sesión ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <RadioGroupField
              legend="Tipo de participante"
              name="tipo"
              options={[['piloto', TRACK_LABEL.piloto], ['objetivo', TRACK_LABEL.objetivo]]}
              value={tipo}
              onChange={setTipo}
              inline={false}
              required
              error={err(participantErrors, 'tipo')}
              hint={
                tipo === 'piloto'
                  ? 'Valida el procedimiento con las mismas actividades (como ensayo) y una encuesta final. No es evidencia de accesibilidad.'
                  : tipo === 'objetivo'
                    ? 'Persona con ceguera total: sus respuestas formales son la evidencia del Objetivo 3.'
                    : 'Determina el consentimiento que se lee y las pruebas de la sesión.'
              }
            />
            <TextField
              label="Código del participante"
              value={codigo}
              onChange={(v) => {
                codeEdited.current = true
                setCodigo(v.toUpperCase().trim())
              }}
              required
              error={showErrors || duplicate ? participantErrors.codigo : undefined}
              hint="Asignado automáticamente (siguiente código libre). El nombre solo va en el formato impreso del consentimiento."
            />
          </div>

          {tipo === 'objetivo' && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <RadioGroupField
                legend="Tipo de ceguera"
                name="ceguera"
                options={CEGUERA_OPTS.filter(([v]) => v !== 'no_aplica')}
                value={cv.tipo_ceguera}
                onChange={(v) => setCv({ tipo_ceguera: v, etapa_adquisicion: v === 'adquirida' ? cv.etapa_adquisicion : null })}
                error={err(participantErrors, 'tipo_ceguera')}
                required
              />
              {cv.tipo_ceguera === 'adquirida' && (
                <RadioGroupField
                  legend="Etapa aproximada de adquisición"
                  name="etapa"
                  options={ETAPA_OPTS}
                  value={cv.etapa_adquisicion}
                  onChange={(v) => setCv({ etapa_adquisicion: v })}
                  error={err(participantErrors, 'etapa_adquisicion')}
                  required
                />
              )}
              <RadioGroupField
                legend="¿Tuvo experiencia visual previa?"
                name="exp-visual"
                options={SINO_OPTS}
                value={cv.experiencia_visual_previa}
                onChange={(v) => setCv({ experiencia_visual_previa: v })}
                error={err(participantErrors, 'experiencia_visual_previa')}
                hint="Solo para interpretar la comprensión de objetos y relaciones espaciales. No se registra historia clínica."
                required
              />
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-border p-4">
            <CheckboxGroupField
              legend="Tecnologías y dispositivos que utiliza habitualmente"
              options={TECNOLOGIA_OPTS}
              values={tec.utiliza}
              onChange={(v) => setTec({ utiliza: v })}
              error={err(participantErrors, 'utiliza')}
              required
            />
            {tec.utiliza.includes('otra') && (
              <TextField
                label="Otra tecnología"
                value={tec.otra_descripcion ?? ''}
                onChange={(v) => setTec({ otra_descripcion: v })}
                error={err(participantErrors, 'otra_descripcion')}
                required
              />
            )}
            {tec.utiliza.includes('lector_pantalla') && (
              <>
                <CheckboxGroupField
                  legend="Lector de pantalla"
                  options={LECTOR_OPTS}
                  values={tec.lectores_pantalla}
                  onChange={(v) => setTec({ lectores_pantalla: v })}
                  error={err(participantErrors, 'lectores_pantalla')}
                  required
                />
                {tec.lectores_pantalla.includes('otro') && (
                  <TextField
                    label="Otro lector de pantalla"
                    value={tec.lector_otro ?? ''}
                    onChange={(v) => setTec({ lector_otro: v })}
                    error={err(participantErrors, 'lector_otro')}
                    required
                  />
                )}
              </>
            )}
            {!tec.utiliza.includes('ninguna') && tec.utiliza.length > 0 && (
              <RadioGroupField
                legend="Frecuencia de uso de estas tecnologías"
                name="frecuencia"
                options={FRECUENCIA_OPTS}
                value={tec.frecuencia_uso}
                onChange={(v) => setTec({ frecuencia_uso: v })}
                error={err(participantErrors, 'frecuencia_uso')}
                required
              />
            )}
            <RadioGroupField
              legend="¿Ha usado herramientas que describen imágenes o escenas mediante audio?"
              name="exp-audio"
              options={SINO_OPTS}
              value={ficha.experiencia_descripcion_audio}
              onChange={(v) => setFicha((f) => ({ ...f, experiencia_descripcion_audio: v }))}
              required
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">Condiciones de esta sesión</p>
            <RadioGroupField
              legend="Dispositivo utilizado en esta sesión"
              name="dispositivo"
              options={DISPOSITIVO_OPTS}
              value={contexto.dispositivo}
              onChange={(v) => setContexto((c) => ({ ...c, dispositivo: v }))}
              required
            />
            {contexto.dispositivo === 'otro' && (
              <TextField
                label="Otro dispositivo"
                value={contexto.dispositivo_otro ?? ''}
                onChange={(v) => setContexto((c) => ({ ...c, dispositivo_otro: v }))}
                error={err(contextErrors, 'dispositivo_otro')}
                required
              />
            )}
            <RadioGroupField
              legend="Reproducción del audio"
              name="reproduccion"
              options={REPRODUCCION_OPTS}
              value={contexto.reproduccion_audio}
              onChange={(v) => setContexto((c) => ({ ...c, reproduccion_audio: v }))}
              required
            />
            {contexto.reproduccion_audio === 'otro' && (
              <TextField
                label="Otro método de reproducción"
                value={contexto.reproduccion_otro ?? ''}
                onChange={(v) => setContexto((c) => ({ ...c, reproduccion_otro: v }))}
                error={err(contextErrors, 'reproduccion_otro')}
                required
              />
            )}
            <p className="text-xs text-muted-foreground">
              Registrado automáticamente por el navegador: {contexto.entorno_tecnico?.navegador ?? 'navegador desconocido'} ·{' '}
              {contexto.entorno_tecnico?.sistema_operativo ?? 'SO desconocido'} · {contexto.entorno_tecnico?.tipo_dispositivo ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* ── Paso 2: consentimiento leído en voz alta y grabado ── */}
      {/* Se mantiene montado (oculto) para no perder la grabación al volver al paso 1. */}
      {tipo && doc && (
        <div className="space-y-4" hidden={step !== 1}>
          <div className="flex gap-2 p-3 rounded-lg bg-[#EEEDFE] text-[#2E2A6B] text-sm">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Pida permiso verbal para grabar la lectura del consentimiento.</li>
              <li>Pulse "Grabar lectura del consentimiento" y lea el texto completo en voz alta.</li>
              <li>Lea cada afirmación y registre abajo la respuesta del participante.</li>
              <li>Detenga la grabación y complete abajo los datos del acta. No pida el nombre en voz alta mientras graba.</li>
              <li>Imprima o guarde el acta en PDF y fírmela.</li>
            </ol>
          </div>

          <AudioRecorder
            key={tipo}
            title="Grabación de la lectura del consentimiento (obligatoria)"
            startLabel="Grabar lectura del consentimiento"
            readyText="Grabación lista: se guarda al crear la sesión."
            onChange={(blob, duration) => setRecording(blob ? { blob, duration } : null)}
          />
          {showErrors && !recording && (
            <p className="text-xs text-[#B42318]">Sin la grabación del consentimiento no se puede crear la sesión.</p>
          )}

          <ConsentText tipo={tipo} />
          <ConsentDownloadLinks tipo={tipo} />

          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              Respuesta del participante a cada afirmación (todas deben ser «sí» para participar)
            </p>
            {CONSENT_KEYS.map((k, i) => (
              <RadioGroupField
                key={k}
                legend={`${i + 1}. ${doc.afirmaciones[k]}`}
                name={`afirmacion-${k}`}
                options={[['si', 'Sí'], ['no', 'No']]}
                value={answers[k]}
                onChange={(v) => setAnswers((a) => ({ ...a, [k]: v }))}
                error={showErrors && answers[k] === null ? 'Registre la respuesta del participante.' : undefined}
                required
              />
            ))}
            {anyNo && (
              <div role="alert" className="flex gap-2 p-3 rounded-lg bg-[#FEF3F2] text-[#912018] text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Con una respuesta «no» la persona no puede participar (la grabación es condición del §5). No se crea la sesión:
                  use «Cancelar».
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">13. Registro del consentimiento (acta)</p>
              <p className="text-xs text-muted-foreground">
                Estos datos se imprimen en el acta. El nombre no se guarda en el sistema: solo queda en el papel o PDF.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Nombre completo del participante"
                value={nombre}
                onChange={setNombre}
                required
                error={showErrors ? actaErrors.nombre : undefined}
                hint="Solo para el acta impresa."
              />
              <TextField label="Código de participante" value={codigo} onChange={() => {}} hint="Asignado en el paso 1." inputClassName="bg-muted/40" />
              <TextField label="Lugar" value={lugar} onChange={setLugar} required error={showErrors ? actaErrors.lugar : undefined} />
              <TextField label="Fecha" value={fecha} onChange={setFecha} required error={showErrors ? actaErrors.fecha : undefined} />
            </div>
            <dl className="grid sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
              {(
                [
                  ['Consentimiento para participar', acta.participar],
                  ['Autorización de grabación de audio', acta.grabacion],
                  ['Autorización para uso académico de respuestas y observaciones', acta.usoAcademico],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v === null ? '— (según la afirmación)' : v ? 'Sí' : 'No'}</dd>
                </div>
              ))}
            </dl>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={Object.keys(actaErrors).length > 0 || !consent || !consentComplete(consent)}
              onClick={imprimirActa}
            >
              <Printer className="w-4 h-4" aria-hidden="true" /> Imprimir / guardar acta en PDF
            </Button>
            <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
              {popupBlocked
                ? 'No se pudo abrir la impresión del acta en este navegador.'
                : actaImpresa
                  ? 'Acta generada. Guárdela junto con los demás formatos firmados.'
                  : 'Se habilita cuando las cuatro afirmaciones son «sí» y el acta tiene nombre, lugar y fecha.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Paso 3: confirmar ── */}
      {step === 2 && tipo && doc && consent && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revise con el participante los datos registrados antes de iniciar. Para corregir algo use «Anterior».
          </p>
          <dl className="grid sm:grid-cols-[14rem_1fr] gap-x-6 gap-y-2 text-sm rounded-lg border border-border p-4">
            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-medium">
              {codigo} {TEST_CODE_RE.test(codigo) && <span className="text-xs">(prueba técnica)</span>}
            </dd>
            <dt className="text-muted-foreground">Tipo de participante</dt>
            <dd>{TRACK_LABEL[tipo]}</dd>
            {tipo === 'objetivo' && (
              <>
                <dt className="text-muted-foreground">Condición visual</dt>
                <dd>
                  Ceguera {label(CEGUERA_OPTS, cv.tipo_ceguera).toLowerCase()}
                  {cv.tipo_ceguera === 'adquirida' && ` (${label(ETAPA_OPTS, cv.etapa_adquisicion).toLowerCase()})`} · experiencia
                  visual previa: {label(SINO_OPTS, cv.experiencia_visual_previa).toLowerCase()}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Tecnologías habituales</dt>
            <dd>
              {tec.utiliza.map((t) => (t === 'otra' ? tec.otra_descripcion : label(TECNOLOGIA_OPTS, t))).join(', ')}
              {lectoresUsados.length > 0 &&
                ` · lector: ${lectoresUsados.map((l) => (l === 'otro' ? tec.lector_otro : label(LECTOR_OPTS, l))).join(', ')}`}
              {tec.frecuencia_uso && ` · ${label(FRECUENCIA_OPTS, tec.frecuencia_uso).toLowerCase()}`}
            </dd>
            <dt className="text-muted-foreground">Descripción de imágenes por audio</dt>
            <dd>{label(SINO_OPTS, ficha.experiencia_descripcion_audio)}</dd>
            <dt className="text-muted-foreground">Dispositivo / audio</dt>
            <dd>
              {contexto.dispositivo === 'otro' ? contexto.dispositivo_otro : label(DISPOSITIVO_OPTS, contexto.dispositivo)} ·{' '}
              {contexto.reproduccion_audio === 'otro' ? contexto.reproduccion_otro : label(REPRODUCCION_OPTS, contexto.reproduccion_audio)}
            </dd>
            <dt className="text-muted-foreground">Consentimiento leído</dt>
            <dd>{doc.version}</dd>
            {CONSENT_KEYS.map((k, i) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">Afirmación {i + 1}</dt>
                <dd>
                  <strong>Sí</strong> — {doc.afirmaciones[k]}
                </dd>
              </div>
            ))}
            <dt className="text-muted-foreground">Grabación del consentimiento</dt>
            <dd>
              {recording ? `${fmtDuration(recording.duration)} · ${(recording.blob.size / 1024).toFixed(0)} KB` : 'Falta'}
            </dd>
            <dt className="text-muted-foreground">Grabación de respuestas</dt>
            <dd>Autorizada (afirmación 3)</dd>
            <dt className="text-muted-foreground">Acta (§13)</dt>
            <dd>
              {acta.lugar}, {acta.fecha} · {actaImpresa ? 'generada' : 'aún no generada'}
            </dd>
          </dl>
          {!actaImpresa && (
            <div role="note" className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>El acta todavía no se ha impreso. El nombre no se guarda: imprímala antes de crear la sesión.</span>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={imprimirActa}>
                <Printer className="w-4 h-4" aria-hidden="true" /> Imprimir acta
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <ErrorCard message={error} />}

      <div className="flex justify-between gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Anterior
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={step === 1 && anyNo} className={`gap-2 ${primaryButtonClass}`}>
            Siguiente <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={isCreating || encoding} className={`gap-2 ${primaryButtonClass}`}>
            {isCreating || encoding ? (
              <>
                <Spinner className="w-4 h-4" /> Creando sesión…
              </>
            ) : (
              'Crear sesión e ir a las pruebas'
            )}
          </Button>
        )}
      </div>
    </section>
  )
}
