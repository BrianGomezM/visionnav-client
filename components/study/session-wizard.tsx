'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import {
  CheckboxGroupField,
  RadioGroupField,
  TextAreaField,
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
import { CONSENT_STATEMENTS, CONSENT_VERSION, RECORDING_STATEMENT } from '@/lib/consent'
import { ConsentDownloadButton, ConsentText } from '@/components/study/consent-document'

const STEPS =['Participante', 'Consentimiento', 'Grabación', 'Contexto de la sesión', 'Confirmar'] as const

const EMPTY_FICHA: Ficha = {
  condicion_visual: { tipo_ceguera: 'congenita', etapa_adquisicion: null, experiencia_visual_previa: null },
  tecnologias: { utiliza: [], otra_descripcion: null, lectores_pantalla: [], lector_otro: null, frecuencia_uso: null },
  experiencia_descripcion_audio: 'no_informa',
}

const EMPTY_CONSENT: Consentimiento = {
  modalidad: 'verbal',
  comprende_y_acepta: false,
  puede_retirarse: false,
  uso_anonimo: false,
  // Trazabilidad: versión del texto leído (lib/consent.ts).
  formato_referencia: CONSENT_VERSION,
}

/**
 * Registro de la sesión en 5 pasos. No se guarda NADA en el servidor hasta el
 * último paso, y el servidor rechaza la sesión sin consentimiento completo.
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
  const [tipo, setTipo] = useState<TipoParticipante>('objetivo')
  const [ficha, setFicha] = useState<Ficha>(EMPTY_FICHA)
  const [consent, setConsent] = useState<Consentimiento>(EMPTY_CONSENT)
  const [grabacion, setGrabacion] = useState<boolean | null>(null)
  const [contexto, setContexto] = useState<Contexto>({
    dispositivo: 'computador',
    dispositivo_otro: null,
    reproduccion_audio: 'audifonos',
    reproduccion_otro: null,
    entorno_tecnico: null,
  })
  const [investigador, setInvestigador] = useState('')
  const [notas, setNotas] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // Entorno técnico: lo registra el navegador (no se pregunta al participante).
    setContexto((c) => ({ ...c, entorno_tecnico: parseUserAgent(navigator.userAgent, navigator.maxTouchPoints) }))
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // En piloto no hay ceguera; en objetivo no se admite "no aplica".
  useEffect(() => {
    setFicha((f) => ({
      ...f,
      condicion_visual:
        tipo === 'piloto'
          ? { tipo_ceguera: 'no_aplica', etapa_adquisicion: null, experiencia_visual_previa: null }
          : f.condicion_visual.tipo_ceguera === 'no_aplica'
            ? { ...EMPTY_FICHA.condicion_visual }
            : f.condicion_visual,
    }))
  }, [tipo])

  const participantErrors = validateParticipant(codigo, tipo, ficha)
  const duplicate = existingCodes.includes(codigo)
  if (duplicate) participantErrors.codigo = 'Ese código ya tiene una sesión: recupérela desde la lista.'
  const contextErrors = validateContext(contexto)

  const stepValid = [
    Object.keys(participantErrors).length === 0,
    consentComplete(consent),
    grabacion !== null,
    Object.keys(contextErrors).length === 0,
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

  const submit = () =>
    onCreate({
      codigo,
      tipo_participante: tipo,
      ficha: normalizeFicha(ficha),
      consentimiento: { ...consent, formato_referencia: consent.formato_referencia?.trim() || null },
      grabacion: { autoriza_grabacion_audio: grabacion === true },
      contexto: {
        ...contexto,
        dispositivo_otro: contexto.dispositivo === 'otro' ? contexto.dispositivo_otro : null,
        reproduccion_otro: contexto.reproduccion_audio === 'otro' ? contexto.reproduccion_otro : null,
      },
      investigador: investigador.trim() || undefined,
      notas: notas.trim() || undefined,
    })

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

      {/* ── Paso 1: identificación + ficha mínima ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              label="Código del participante"
              value={codigo}
              onChange={(v) => setCodigo(v.toUpperCase().trim())}
              required
              error={showErrors || duplicate ? participantErrors.codigo : undefined}
              hint="Anonimizado (P01, P02…). PTEST01… solo para pruebas técnicas. La correspondencia con la persona se guarda fuera del sistema."
            />
            <RadioGroupField
              legend="Tipo de participante"
              name="tipo"
              options={[['objetivo', TRACK_LABEL.objetivo], ['piloto', TRACK_LABEL.piloto]]}
              value={tipo}
              onChange={setTipo}
              inline={false}
              required
              hint={tipo === 'piloto' ? 'El piloto valida procedimiento, duración e instrumento; no es evidencia de accesibilidad.' : undefined}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button type="button" variant="outline" size="sm" onClick={() => setCodigo(suggestNextCode(existingCodes))}>
              Sugerir código de participante
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setCodigo(suggestNextCode(existingCodes, true))}>
              Sugerir código de prueba técnica
            </Button>
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
        </div>
      )}

      {/* ── Paso 2: consentimiento ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div role="note" className="flex gap-2 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Borrador pendiente de revisión de los directores (doc. 27, §L y §W):</strong> el texto es una
              adaptación a este protocolo del formato de otro estudio (tareas físicas, audio y video). No está aprobado y
              no se ha verificado si se requiere aprobación ética institucional. Aquí solo se registra lo que el
              investigador leyó y lo que el participante respondió.
            </p>
          </div>
          <ConsentText />
          <ConsentDownloadButton />
          <RadioGroupField
            legend="Modalidad del consentimiento"
            name="modalidad"
            options={[['verbal', 'Verbal (leído en voz alta)'], ['escrito', 'Escrito']]}
            value={consent.modalidad}
            onChange={(v) => setConsent((c) => ({ ...c, modalidad: v }))}
            required
          />
          <fieldset className="space-y-2" aria-describedby="consent-hint">
            <legend className="text-sm font-medium text-foreground">
              Respuesta del participante a cada afirmación (debe ser &quot;sí&quot; en todas)
            </legend>
            {(Object.entries(CONSENT_STATEMENTS) as [keyof typeof CONSENT_STATEMENTS, string][]).map(([k, text], i) => (
              <label key={k} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-[#4B45A8]"
                  checked={consent[k]}
                  onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))}
                />
                <span>
                  {i + 1}. {text}
                </span>
              </label>
            ))}
            <p id="consent-hint" className="text-xs text-muted-foreground">
              La grabación de audio se registra aparte, en el paso siguiente.
            </p>
            {showErrors && !consentComplete(consent) && (
              <p className="text-xs text-[#B42318]">Sin las tres respuestas afirmativas no se puede iniciar la sesión.</p>
            )}
          </fieldset>
          <TextField
            label="Referencia del formato usado (opcional)"
            value={consent.formato_referencia ?? ''}
            onChange={(v) => setConsent((c) => ({ ...c, formato_referencia: v }))}
            hint="Se completa con la versión del texto leído. No escriba aquí el nombre del participante."
          />
        </div>
      )}

      {/* ── Paso 3: autorización de grabación ── */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Distinga: el <strong>audio de la narrativa</strong> lo genera la API y siempre se guarda con la respuesta
            (es el estímulo). La <strong>grabación del participante</strong> es su voz y solo se guarda si autoriza
            aquí y el servidor almacena fuera del repositorio (DATA_ROOT).
          </p>
          <p className="text-sm">
            <strong>Afirmación 4 (opcional):</strong> {RECORDING_STATEMENT}
          </p>
          <RadioGroupField
            legend="¿El participante autoriza grabar el audio de sus respuestas?"
            name="grabacion"
            options={[['si', 'Sí, autoriza'], ['no', 'No autoriza']]}
            value={grabacion === null ? null : grabacion ? 'si' : 'no'}
            onChange={(v) => setGrabacion(v === 'si')}
            error={showErrors && grabacion === null ? 'Registre la respuesta del participante.' : undefined}
            required
            hint="Pendiente de confirmar con los directores si el consentimiento cubre la grabación y quién accede a ella."
          />
        </div>
      )}

      {/* ── Paso 4: contexto técnico ── */}
      {step === 3 && (
        <div className="space-y-4">
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
          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Registrado automáticamente por el navegador</p>
            <p>
              {contexto.entorno_tecnico?.navegador ?? 'Navegador desconocido'} ·{' '}
              {contexto.entorno_tecnico?.sistema_operativo ?? 'SO desconocido'} ·{' '}
              {contexto.entorno_tecnico?.tipo_dispositivo ?? '—'}
            </p>
          </div>
          <TextField
            label="Investigador (iniciales o código, opcional)"
            value={investigador}
            onChange={setInvestigador}
          />
          <TextAreaField
            label="Notas de la sesión (opcional)"
            value={notas}
            onChange={setNotas}
            hint="No incluya nombres ni datos que identifiquen al participante."
          />
        </div>
      )}

      {/* ── Paso 5: confirmar ── */}
      {step === 4 && (
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Código</dt>
          <dd className="font-medium">
            {codigo} {TEST_CODE_RE.test(codigo) && <span className="text-xs">(prueba técnica)</span>}
          </dd>
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{TRACK_LABEL[tipo]}</dd>
          <dt className="text-muted-foreground">Consentimiento</dt>
          <dd>Otorgado ({consent.modalidad})</dd>
          <dt className="text-muted-foreground">Grabación del participante</dt>
          <dd>{grabacion ? 'Autorizada' : 'No autorizada: no se grabará'}</dd>
          <dt className="text-muted-foreground">Dispositivo / audio</dt>
          <dd>
            {contexto.dispositivo} · {contexto.reproduccion_audio}
          </dd>
        </dl>
      )}

      {error && <ErrorCard message={error} />}

      <div className="flex justify-between gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Anterior
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className={`gap-2 ${primaryButtonClass}`}>
            Siguiente <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={isCreating} className={`gap-2 ${primaryButtonClass}`}>
            {isCreating ? (
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
