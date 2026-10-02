'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Flag, ListChecks, PlayCircle, RefreshCw, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ErrorCard } from '@/components/shared/error-card'
import { useStudySessionDetail, useStudySessions, useStudyActions } from '@/hooks/use-study'
import { useCatalog, type CatalogUserTest } from '@/hooks/use-catalog'
import { ResearcherKeyGate } from '@/components/study/researcher-key-gate'
import { SessionWizard } from '@/components/study/session-wizard'
import { TestRunner } from '@/components/study/test-runner'
import { SessionClose } from '@/components/study/session-close'
import { SessionResults } from '@/components/study/session-results'
import { ConsentDownloadLinks } from '@/components/study/consent-document'
import { TestInfo } from '@/components/study/test-info'
import { primaryButtonClass } from '@/components/study/form-controls'
import { TRACK_LABEL, executionRule, type SessionListItem } from '@/lib/study-protocol'
import { FieldInfo } from '@/components/study/field-info'
import { FIELD_HELP } from '@/lib/study-help'

/** Identificador interno de la práctica (no es una prueba del catálogo). */
const PRACTICA = '__practica__'
import { cn } from '@/lib/utils'

interface StudyTabProps {
  baseUrl: string
  isActive: boolean
}

type View = 'list' | 'wizard' | 'session' | 'close' | 'results'

/**
 * Evaluación con usuarios (Objetivo 3). Instrumento operado por el investigador:
 * el participante escucha el audio de la API y responde verbalmente.
 *
 * Flujo: participante (ficha y contexto) → consentimiento (lectura grabada + 4
 * afirmaciones) → confirmar → práctica (escena de familiarización, ensayo) → pruebas
 * del catálogo en orden → audio CONGELADO de la escena → respuesta y codificación →
 * notas → guardar → siguiente prueba → finalizar (cuestionario breve) → resultados.
 *
 * Piloto: recorre las mismas actividades, con las mismas escenas y audios, registradas
 * como formales en el grupo piloto (consolidado aparte; no es evidencia de
 * accesibilidad), y después las preguntas sobre el procedimiento (PIL-*).
 */
export function StudyTab({ baseUrl, isActive }: StudyTabProps) {
  const sessions = useStudySessions(baseUrl, isActive)
  const catalogApi = useCatalog(baseUrl, isActive)
  const actions = useStudyActions(baseUrl)

  const [view, setView] = useState<View>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [runnerKey, setRunnerKey] = useState(0)
  const [toDelete, setToDelete] = useState<SessionListItem | null>(null)
  const [announce, setAnnounce] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const runnerRef = useRef<HTMLDivElement>(null)

  const detail = useStudySessionDetail(baseUrl, activeId)
  const sesion = detail.data?.sesion ?? null

  useEffect(() => {
    titleRef.current?.focus()
  }, [view, activeId])

  // Al elegir una prueba (o pasar a la siguiente), la pantalla baja hasta ella: en pantallas
  // medianas la lista va arriba y el reproductor quedaría fuera de la vista.
  useEffect(() => {
    if (!selectedTestId || !runnerRef.current) return
    const top = runnerRef.current.getBoundingClientRect().top
    if (top < 0 || top > window.innerHeight * 0.4) runnerRef.current.scrollIntoView({ block: 'start' })
  }, [selectedTestId, runnerKey])

  const trackTests: CatalogUserTest[] = useMemo(
    () => (catalogApi.catalog?.pruebas_usuario ?? []).filter((t) => !sesion || t.pista === sesion.tipo_participante),
    [catalogApi.catalog, sesion]
  )
  const otherTrackTests = useMemo(
    () =>
      sesion && (sesion.tipo_participante === 'piloto' || sesion.es_prueba_tecnica)
        ? (catalogApi.catalog?.pruebas_usuario ?? []).filter((t) => t.pista !== sesion.tipo_participante)
        : [],
    [catalogApi.catalog, sesion]
  )
  const formalDone = useMemo(
    () => new Set((detail.data?.respuestas ?? []).filter((r) => r.modo === 'formal').map((r) => r.prueba.id)),
    [detail.data]
  )
  const usedStimuli = useMemo(
    () => new Set((detail.data?.respuestas ?? []).map((r) => r.estimulo?.stimulus_id).filter(Boolean) as string[]),
    [detail.data]
  )
  // Pruebas que esta sesión puede registrar como formales (el piloto incluye las actividades objetivo).
  const formalTests = sesion
    ? [...trackTests, ...otherTrackTests].filter((t) => executionRule(t, sesion.tipo_participante, sesion.es_prueba_tecnica).formal)
    : []
  const isPractice = selectedTestId === PRACTICA
  // La práctica usa la pregunta de identificación de objetos (la primera prueba objetivo que
  // codifica objetos, sin fijar su id) con la escena de práctica, en modo ensayo.
  const practiceTest =
    (catalogApi.catalog?.pruebas_usuario ?? []).find((t) => t.pista === 'objetivo' && t.codificacion?.includes('objetos')) ?? null
  const hasPractice = (catalogApi.catalog?.estimulos ?? []).some((s) => s.practica)
  const practiceDone = (detail.data?.respuestas ?? []).some((r) =>
    (catalogApi.catalog?.estimulos ?? []).some((s) => s.practica && s.stimulus_id === r.estimulo?.stimulus_id)
  )
  const selectedTest = isPractice
    ? practiceTest
    : [...trackTests, ...otherTrackTests].find((t) => t.id === selectedTestId) ?? null
  // Orden de ejecución: en piloto, primero las actividades con audio y luego la encuesta.
  const isPilot = sesion?.tipo_participante === 'piloto'
  const orderedTests = isPilot ? [...otherTrackTests, ...trackTests] : [...trackTests, ...otherTrackTests]

  const openSession = (id: string, v: View = 'session') => {
    setActiveId(id)
    setSelectedTestId(null)
    setView(v)
  }

  const goNext = () => {
    // La siguiente prueba ejecutable después de la actual (en el orden de la sesión); si no
    // queda ninguna, la primera formal pendiente.
    if (!sesion) return
    const runnable = (t: CatalogUserTest) => {
      const r = executionRule(t, sesion.tipo_participante, sesion.es_prueba_tecnica)
      return (r.formal && !formalDone.has(t.id)) || (!r.formal && r.ensayo)
    }
    const idx = isPractice ? -1 : orderedTests.findIndex((t) => t.id === selectedTestId)
    const pending =
      orderedTests.slice(idx + 1).find(runnable) ??
      formalTests.find((t) => !formalDone.has(t.id) && t.id !== selectedTestId)
    setSelectedTestId(pending?.id ?? null)
    setRunnerKey((k) => k + 1)
    setAnnounce(pending ? `Siguiente prueba: ${pending.id}` : 'No quedan pruebas pendientes en esta sesión.')
  }

  // ── Encabezado común ──
  const header = (title: string, subtitle?: string) => (
    <div>
      <h2 ref={titleRef} tabIndex={-1} className="text-xl font-semibold text-foreground flex items-center gap-2 focus:outline-none">
        <Users className="w-5 h-5 text-[#4B45A8]" aria-hidden="true" />
        {title}
      </h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )

  // Sin clave (study/production) no se consulta: se pide la clave antes de cualquier 401.
  const keyMissing = sessions.unauthorized || sessions.needsKey
  const gate = keyMissing ? <ResearcherKeyGate /> : null

  // ─────────────────────────────────────────────
  // Lista de sesiones
  // ─────────────────────────────────────────────
  if (view === 'list' || view === 'wizard') {
    const codes = sessions.data?.sesiones.map((s) => s.codigo) ?? []
    return (
      <div className="space-y-6">
        {header(
          'Evaluación con usuarios',
          'Una sesión por participante. El investigador opera esta pantalla; el participante escucha el audio y responde verbalmente.'
        )}
        <p role="status" aria-live="polite" className="sr-only">{announce}</p>
        {gate}

        {view === 'wizard' ? (
          <SessionWizard
            existingCodes={codes}
            isCreating={actions.create.isLoading}
            error={actions.create.error}
            onCancel={() => setView('list')}
            onCreate={async (payload) => {
              const r = await actions.create.run(payload)
              if (r) {
                sessions.refresh()
                setAnnounce(`Sesión ${r.sesion.codigo} creada.`)
                openSession(r.session_id)
              }
            }}
          />
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setView('wizard')} disabled={keyMissing} className={`gap-2 ${primaryButtonClass}`}>
              <UserPlus className="w-4 h-4" aria-hidden="true" /> Nueva sesión
            </Button>
          </div>
        )}
        {view !== 'wizard' && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Consentimientos informados (formato impreso)</p>
            <ConsentDownloadLinks tipo="piloto" withLabel />
            <ConsentDownloadLinks tipo="objetivo" withLabel />
          </div>
        )}

        <section aria-labelledby="sessions-title" className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="sessions-title" className="font-medium text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#4B45A8]" aria-hidden="true" /> Sesiones registradas
            </h3>
            <Button variant="ghost" size="sm" onClick={sessions.refresh} className="gap-1 text-xs">
              <RefreshCw className={cn('w-3 h-3', sessions.isLoading && 'animate-spin')} aria-hidden="true" /> Actualizar
            </Button>
          </div>
          {sessions.isLoading && <p className="text-sm text-muted-foreground" role="status">Cargando sesiones…</p>}
          {sessions.error && !sessions.unauthorized && <ErrorCard message={sessions.error} />}
          {sessions.data?.total === 0 && <p className="text-sm text-muted-foreground">Aún no hay sesiones registradas.</p>}
          {!!sessions.data?.sesiones_heredadas_omitidas && (
            <p className="text-xs text-muted-foreground">
              {sessions.data.sesiones_heredadas_omitidas} sesión(es) del formato anterior (identificador con nombre) no se
              muestran ni se modifican.
            </p>
          )}
          <ul className="space-y-2">
            {sessions.data?.sesiones.map((s) => (
              <li key={s.session_id} className="p-3 rounded-lg border border-border bg-muted/20 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {s.codigo} {s.es_prueba_tecnica && <span className="text-xs">(prueba técnica)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TRACK_LABEL[s.tipo_participante]} · {s.estado === 'finalizada' ? 'Finalizada' : 'En curso'} ·{' '}
                    {s.num_formales} formal(es), {s.num_respuestas - s.num_formales} ensayo(s)
                  </p>
                </div>
                <div className="flex gap-1">
                  {s.estado === 'en_curso' && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => openSession(s.session_id)}>
                      <PlayCircle className="w-4 h-4" aria-hidden="true" /> Continuar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openSession(s.session_id, 'results')}>
                    <ListChecks className="w-4 h-4" aria-hidden="true" /> Resultados
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Eliminar la sesión ${s.codigo}`} onClick={() => setToDelete(s)}>
                    <Trash2 className="w-4 h-4 text-[#B42318]" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/20 p-4">
          <strong className="text-foreground">Almacenamiento:</strong> los datos de participantes reales solo se guardan
          si el servidor usa DATA_ROOT (fuera del repositorio); sin él solo se aceptan códigos de prueba (PTEST01…).
          Las sesiones piloto validan el instrumento; solo las de participantes objetivo son evidencia del Objetivo 3.
        </p>

        <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar la sesión {toDelete?.codigo}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran del servidor la ficha, las respuestas y los audios de esta sesión. No se puede deshacer.
                Úselo solo ante el retiro del participante o para sesiones de prueba.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {actions.remove.error && <ErrorCard message={actions.remove.error} />}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#B42318] hover:bg-[#912018] text-white"
                onClick={async () => {
                  if (!toDelete) return
                  const ok = await actions.remove.run(toDelete.session_id)
                  if (ok) {
                    setAnnounce(`Sesión ${toDelete.codigo} eliminada.`)
                    sessions.refresh()
                  }
                  setToDelete(null)
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Sesión activa
  // ─────────────────────────────────────────────
  const back = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setView('list')
        setActiveId(null)
        sessions.refresh()
      }}
      className="gap-2"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a la lista
    </Button>
  )

  if (!sesion) {
    return (
      <div className="space-y-4">
        {back}
        {detail.isLoading && <p role="status">Cargando sesión…</p>}
        {detail.error && <ErrorCard message={detail.error} />}
      </div>
    )
  }

  const title = `Sesión ${sesion.codigo}`
  const subtitle = `${TRACK_LABEL[sesion.tipo_participante]}${sesion.es_prueba_tecnica ? ' · prueba técnica' : ''} · ${
    sesion.estado === 'finalizada' ? 'finalizada' : 'en curso'
  }`

  if (view === 'results' || sesion.estado === 'finalizada') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {header(title, subtitle)}
          <div className="flex gap-2">
            {sesion.estado === 'en_curso' && (
              <Button variant="outline" size="sm" onClick={() => setView('session')}>
                Ir a las pruebas
              </Button>
            )}
            {back}
          </div>
        </div>
        {detail.data && <SessionResults baseUrl={baseUrl} detail={detail.data} />}
      </div>
    )
  }

  if (view === 'close') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {header(title, subtitle)}
          {back}
        </div>
        <SessionClose
          isLoading={actions.close.isLoading}
          error={actions.close.error}
          pendingTests={formalTests.filter((t) => !formalDone.has(t.id)).map((t) => t.id)}
          onCancel={() => setView('session')}
          onClose={async (payload) => {
            const r = await actions.close.run(sesion.session_id, payload)
            if (r) {
              setAnnounce(`Sesión ${sesion.codigo} finalizada.`)
              detail.refresh()
              sessions.refresh()
              setView('results')
            }
          }}
        />
      </div>
    )
  }

  const renderTest = (t: CatalogUserTest) => {
    const rule = executionRule(t, sesion.tipo_participante, sesion.es_prueba_tecnica)
    const done = formalDone.has(t.id)
    const estado = done ? 'Registrada' : rule.formal ? 'Disponible (formal)' : rule.ensayo ? 'Ensayo (no es evidencia)' : 'Bloqueada: estímulo por definir'
    return (
      <li key={t.id} className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => {
            setSelectedTestId(t.id)
            setRunnerKey((k) => k + 1)
          }}
          aria-current={selectedTestId === t.id ? 'true' : undefined}
          className={cn(
            'flex-1 min-w-0 text-left p-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
            selectedTestId === t.id ? 'border-[#4B45A8] bg-[#EEEDFE]' : 'border-border bg-card hover:border-[#4B45A8]/60'
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {t.id} · {t.nombre}
            </span>
            {done && <CheckCircle2 className="w-4 h-4 text-[#0F6E56] shrink-0" aria-hidden="true" />}
          </span>
          <span className={cn('text-xs mt-0.5 block', rule.formal || rule.ensayo ? 'text-muted-foreground' : 'text-[#7A2E0E]')}>
            {estado}
          </span>
        </button>
        <TestInfo test={t} rule={rule} done={done} />
      </li>
    )
  }

  const blockedFormal = !isPilot && trackTests.length > 0 && formalTests.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {header(title, subtitle)}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setView('results')}>
            <ListChecks className="w-4 h-4" aria-hidden="true" /> Resultados
          </Button>
          <Button size="sm" className={`gap-1 ${primaryButtonClass}`} onClick={() => setView('close')}>
            <Flag className="w-4 h-4" aria-hidden="true" /> Finalizar sesión
          </Button>
          {back}
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      <div>
        <p className="text-sm text-foreground" id="progress-label">
          Progreso: {formalDone.size} de {formalTests.length} pruebas formales disponibles registradas
          {trackTests.length > formalTests.length && ` · ${trackTests.length - formalTests.length} pendiente(s) de definición en el catálogo`}
        </p>
        <progress
          aria-labelledby="progress-label"
          className="w-full h-2 accent-[#4B45A8]"
          max={Math.max(formalTests.length, 1)}
          value={formalDone.size}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <nav aria-label="Pruebas del catálogo" className="space-y-3">
          {catalogApi.isLoading && <p className="text-sm text-muted-foreground" role="status">Cargando catálogo…</p>}
          {catalogApi.error && <ErrorCard message={`No se pudo cargar el catálogo de pruebas: ${catalogApi.error}`} />}
          {blockedFormal && (
            <div role="note" className="flex gap-2 p-3 rounded-lg bg-[#FFFAEB] border border-[#B54708]/30 text-[#7A2E0E] text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Ninguna prueba de esta pista tiene todavía imágenes asignadas en el catálogo del servidor
                (catalog.yaml: estímulos POR DEFINIR). Por eso no se pueden registrar respuestas formales con
                participantes objetivo hasta decidir qué escenas usa cada prueba.
              </p>
            </div>
          )}
          {hasPractice && practiceTest && (
            <div className="flex items-start gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedTestId(PRACTICA)
                  setRunnerKey((k) => k + 1)
                }}
                aria-current={isPractice ? 'true' : undefined}
                className={cn(
                  'flex-1 min-w-0 text-left p-3 rounded-lg border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
                  isPractice ? 'border-[#4B45A8] bg-[#EEEDFE]' : 'border-border bg-card hover:border-[#4B45A8]/60'
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">0 · Práctica (familiarización)</span>
                  {practiceDone && <CheckCircle2 className="w-4 h-4 text-[#0F6E56] shrink-0" aria-hidden="true" />}
                </span>
                <span className="text-xs mt-0.5 block text-muted-foreground">Ensayo, antes de OBJ-01 · no es evidencia</span>
              </button>
              <FieldInfo help={FIELD_HELP.practica} />
            </div>
          )}
          {isPilot ? (
            <>
              <h4 className="text-sm font-medium text-foreground">1. Actividades (mismas escenas y audios; grupo piloto)</h4>
              <ul className="space-y-2">{otherTrackTests.map(renderTest)}</ul>
              <h4 className="text-sm font-medium text-foreground pt-2">2. Encuesta sobre el procedimiento</h4>
              <ul className="space-y-2">{trackTests.map(renderTest)}</ul>
            </>
          ) : (
            <>
              <ul className="space-y-2">{trackTests.map(renderTest)}</ul>
              {otherTrackTests.length > 0 && (
                <details>
                  <summary className="text-sm text-muted-foreground cursor-pointer">Pruebas de la otra pista (solo ensayo)</summary>
                  <ul className="space-y-2 mt-2">{otherTrackTests.map(renderTest)}</ul>
                </details>
              )}
            </>
          )}
        </nav>

        <div ref={runnerRef} className="lg:col-span-2 scroll-mt-20">
          {!selectedTest ? (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Seleccione una prueba del catálogo para comenzar.
            </div>
          ) : (
            <TestRunner
              key={`${isPractice ? PRACTICA : selectedTest.id}-${runnerKey}`}
              practice={isPractice}
              baseUrl={baseUrl}
              sesion={sesion}
              test={selectedTest}
              stimuli={catalogApi.catalog?.estimulos ?? []}
              usedStimuli={usedStimuli}
              onSaved={() => {
                detail.refresh()
                sessions.refresh()
              }}
              onNext={goNext}
            />
          )}
        </div>
      </div>
    </div>
  )
}
