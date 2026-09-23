'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Users,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  Timer,
  RefreshCw,
  Trash2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { AudioSection } from '@/components/detect/audio-section'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDetect } from '@/hooks/use-detect'
import {
  useStudySessions,
  useStudySessionDetail,
  useCreateSession,
  useAddResponse,
  useDeleteSession,
  type TipoParticipante,
} from '@/hooks/use-study'
import { getTestsForTrack, type StudyTest } from '@/lib/study-tests'
import { cn } from '@/lib/utils'

interface StudyTabProps {
  baseUrl: string
  confidenceThreshold: number
  isActive: boolean
}

const TRACK_LABEL: Record<TipoParticipante, string> = {
  objetivo: 'Usuario objetivo (discapacidad visual)',
  piloto: 'Usuario piloto (prototipo, sin discapacidad)',
}

/** Escala Likert 1-5 simple, para un criterio individual. */
function LikertRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-foreground capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'w-7 h-7 rounded-full text-xs font-medium border transition-colors',
              value === n
                ? 'bg-[#7F77DD] border-[#7F77DD] text-white'
                : 'border-border text-muted-foreground hover:border-[#7F77DD]'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Pestaña de Evaluación con usuarios — reemplaza a "Pruebas" y "Feedback".
 *
 * Flujo: registrar/seleccionar participante → menú de pruebas según su
 * tipo (objetivo / piloto) → registrar cada respuesta, que el investigador
 * completa mientras opera la interfaz (el participante no toca la pantalla).
 *
 * Endpoints:
 *   POST /api/study/sessions                       — crear sesión
 *   GET  /api/study/sessions                        — listar sesiones
 *   GET  /api/study/sessions/{id}                    — detalle + respuestas
 *   POST /api/study/sessions/{id}/responses          — registrar respuesta
 */
export function StudyTab({ baseUrl, confidenceThreshold, isActive }: StudyTabProps) {
  const sessions = useStudySessions(baseUrl, isActive)
  const createHook = useCreateSession(baseUrl)
  const deleteHook = useDeleteSession(baseUrl)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  const detail = useStudySessionDetail(baseUrl, activeSessionId)

  // ── Formulario de nueva sesión ──
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoParticipante>('piloto')
  const [edad, setEdad] = useState('')
  const [genero, setGenero] = useState('')
  const [investigador, setInvestigador] = useState('')
  const [consentimiento, setConsentimiento] = useState(false)
  const [autorizaAudio, setAutorizaAudio] = useState(false)

  const handleCreateSession = async () => {
    if (!nombre.trim() || !consentimiento) return
    const result = await createHook.create({
      nombre: nombre.trim(),
      tipo_participante: tipo,
      edad: edad ? Number(edad) : undefined,
      genero: genero.trim() || undefined,
      investigador: investigador.trim() || undefined,
      consentimiento,
      autoriza_grabacion_audio: autorizaAudio,
    })
    if (result) {
      sessions.refresh()
      setActiveSessionId(result.session_id)
      setNombre('')
      setEdad('')
      setGenero('')
      setConsentimiento(false)
      setAutorizaAudio(false)
    }
  }

  const handleDeleteSession = async (id: string) => {
    const ok = await deleteHook.remove(id)
    if (ok) {
      sessions.refresh()
      if (activeSessionId === id) setActiveSessionId(null)
    }
  }

  const testsCompleted = useMemo(
    () => new Set((detail.data?.respuestas ?? []).map((r) => r.prueba_id)),
    [detail.data]
  )

  const track = detail.data?.participant.tipo_participante ?? 'piloto'
  const catalogo = getTestsForTrack(track)
  const selectedTest = catalogo.find((t) => t.id === selectedTestId) ?? null

  // ── Vista: sin sesión activa → registro / historial ──
  if (!activeSessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7F77DD]" />
            Evaluación con usuarios
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registra una sesión por cada participante antes de iniciar las pruebas. El
            investigador opera esta pantalla; el participante solo escucha y responde
            verbalmente, tal como en el guion de sesión de la tesis.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Formulario de nueva sesión ── */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#7F77DD]" />
              Nueva sesión
            </h3>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Nombre del participante <span className="text-[#E24B4A]">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo o identificador"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Tipo de participante <span className="text-[#E24B4A]">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['objetivo', 'piloto'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                      tipo === t
                        ? 'border-[#7F77DD] bg-[#EEEDFE] text-[#4B45A8]'
                        : 'border-border text-muted-foreground hover:border-[#7F77DD]/50'
                    )}
                  >
                    <span className="font-medium">{TRACK_LABEL[t]}</span>
                    <p className="text-xs mt-0.5 opacity-80">
                      {t === 'objetivo'
                        ? 'Resultados válidos como evidencia de accesibilidad.'
                        : 'Solo valida instrucciones, flujo y duración — no es evidencia de accesibilidad.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Edad (opcional)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Género (opcional)</label>
                <input
                  type="text"
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Investigador (opcional)</label>
              <input
                type="text"
                value={investigador}
                onChange={(e) => setInvestigador(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentimiento}
                  onChange={(e) => setConsentimiento(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  El participante autorizó explícitamente participar en esta sesión.{' '}
                  <span className="text-[#E24B4A]">*</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autorizaAudio}
                  onChange={(e) => setAutorizaAudio(e.target.checked)}
                  className="mt-0.5"
                />
                <span>El participante autorizó la grabación de audio de la sesión (si aplica).</span>
              </label>
            </div>

            {createHook.error && <ErrorCard message={createHook.error} />}

            <Button
              onClick={handleCreateSession}
              disabled={!nombre.trim() || !consentimiento || createHook.isLoading}
              className="w-full gap-2 bg-[#7F77DD] hover:bg-[#6B63C8] text-white"
            >
              {createHook.isLoading ? (
                <>
                  <Spinner className="w-4 h-4" /> Creando sesión...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Iniciar sesión y comenzar pruebas
                </>
              )}
            </Button>
          </div>

          {/* ── Historial de sesiones ── */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#7F77DD]" />
                Sesiones registradas
              </h3>
              <Button variant="ghost" size="sm" onClick={sessions.refresh} className="gap-1 h-7 px-2 text-xs">
                <RefreshCw className={cn('w-3 h-3', sessions.isLoading && 'animate-spin')} />
                Actualizar
              </Button>
            </div>

            {sessions.error && <ErrorCard message={sessions.error} />}

            {sessions.data?.total === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay sesiones registradas.</p>
            )}

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {sessions.data?.sesiones.map((s) => (
                <div
                  key={s.session_id}
                  className="p-3 rounded-lg border border-border bg-muted/20 text-sm flex items-center justify-between gap-2"
                >
                  <button className="text-left flex-1 min-w-0" onClick={() => setActiveSessionId(s.session_id)}>
                    <p className="font-medium text-foreground truncate">{s.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRACK_LABEL[s.tipo_participante]} · {s.num_respuestas} respuesta
                      {s.num_respuestas !== 1 ? 's' : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setActiveSessionId(s.session_id)}
                    >
                      <PlayCircle className="w-4 h-4 text-[#7F77DD]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteSession(s.session_id)}
                      title="Eliminar sesión"
                    >
                      <Trash2 className="w-4 h-4 text-[#E24B4A]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nota académica */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Almacenamiento:</strong> cada sesión crea una
            carpeta en <code className="font-mono bg-muted px-1 rounded">study_data/sessions/</code>{' '}
            con los datos del participante y una respuesta por línea, para análisis posterior.
            Las sesiones de tipo piloto validan el instrumento; solo las de tipo objetivo cuentan
            como evidencia de accesibilidad para el Capítulo 5.
          </p>
        </div>
      </div>
    )
  }

  // ── Vista: sesión activa → menú de pruebas + panel de la prueba seleccionada ──
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7F77DD]" />
            {detail.data?.participant.nombre ?? 'Sesión'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {detail.data && TRACK_LABEL[detail.data.participant.tipo_participante]} · Completadas{' '}
            {testsCompleted.size} de {catalogo.length}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveSessionId(null)
            setSelectedTestId(null)
          }}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Cambiar de sesión
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Menú de pruebas ── */}
        <div className="space-y-2">
          {catalogo.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTestId(t.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                selectedTestId === t.id
                  ? 'border-[#7F77DD] bg-[#EEEDFE]'
                  : 'border-border bg-card hover:border-[#7F77DD]/50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{t.nombre}</span>
                {testsCompleted.has(t.id) && <CheckCircle2 className="w-4 h-4 text-[#1D9E75] shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.id}</p>
            </button>
          ))}
        </div>

        {/* ── Panel de la prueba seleccionada ── */}
        <div className="lg:col-span-2">
          {!selectedTest ? (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Selecciona una prueba del menú para comenzar.
            </div>
          ) : (
            <TestRunner
              key={selectedTest.id}
              baseUrl={baseUrl}
              confidenceThreshold={confidenceThreshold}
              sessionId={activeSessionId}
              test={selectedTest}
              onSaved={() => {
                detail.refresh()
                sessions.refresh()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Ejecutor de una prueba individual
// ─────────────────────────────────────────────

function TestRunner({
  baseUrl,
  confidenceThreshold,
  sessionId,
  test,
  onSaved,
}: {
  baseUrl: string
  confidenceThreshold: number
  sessionId: string
  test: StudyTest
  onSaved: () => void
}) {
  const addResponse = useAddResponse(baseUrl)
  const detectHook = useDetect({ baseUrl, confidenceThreshold })

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [correcto, setCorrecto] = useState<boolean | null>(null)
  const [escala, setEscala] = useState<Record<string, number>>({})
  const [observaciones, setObservaciones] = useState('')
  const [repeticiones, setRepeticiones] = useState(0)
  const [saved, setSaved] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)

  const handleFileSelect = useCallback(
    (f: File | null) => {
      setFile(f)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(f ? URL.createObjectURL(f) : null)
      detectHook.reset()
      startTimeRef.current = null
      setElapsedMs(null)
    },
    [previewUrl, detectHook]
  )

  const handlePlay = async () => {
    if (!file) return
    await detectHook.detect(file)
    startTimeRef.current = performance.now()
    setElapsedMs(null)
  }

  const markResponded = () => {
    if (startTimeRef.current !== null) {
      setElapsedMs(performance.now() - startTimeRef.current)
    }
  }

  const handleSave = async () => {
    const result = await addResponse.addResponse(sessionId, {
      prueba_id: test.id,
      prueba_nombre: test.nombre,
      respuesta: respuesta.trim() || undefined,
      correcto: correcto ?? undefined,
      escala: test.tipo === 'escala' && Object.keys(escala).length ? escala : undefined,
      tiempo_respuesta_ms: elapsedMs ?? undefined,
      repeticiones_audio: test.tipo === 'imagen' || test.tipo === 'ruta' ? repeticiones : undefined,
      observaciones: observaciones.trim() || undefined,
      imagen_usada: file?.name,
    })
    if (result) {
      setSaved(true)
      onSaved()
    }
  }

  const resetForm = () => {
    setRespuesta('')
    setCorrecto(null)
    setEscala({})
    setObservaciones('')
    setRepeticiones(0)
    setSaved(false)
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    detectHook.reset()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div>
        <h3 className="font-medium text-foreground">{test.nombre}</h3>
        <p className="text-xs text-muted-foreground mt-1">{test.objetivo}</p>
      </div>

      {/* Guion para el investigador */}
      <div className="flex gap-2 p-3 rounded-lg bg-[#EEEDFE] text-[#4B45A8] text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Guion:</strong> {test.guionInvestigador}
        </p>
      </div>

      {saved ? (
        <div className="p-4 rounded-lg bg-[#E1F5EE] border border-[#1D9E75]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#1D9E75]" />
            <span className="text-sm font-medium text-[#0F6E56]">Respuesta guardada</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetForm}>
            Registrar otra
          </Button>
        </div>
      ) : (
        <>
          {/* ── Bloque de imagen + audio (tipo imagen/ruta) ── */}
          {(test.tipo === 'imagen' || test.tipo === 'ruta') && (
            <div className="space-y-3">
              <ImageUploader
                selectedFile={file}
                previewUrl={previewUrl}
                onFileSelect={handleFileSelect}
                isDisabled={detectHook.isLoading}
              />
              <Button
                onClick={handlePlay}
                disabled={!file || detectHook.isLoading}
                variant="outline"
                className="w-full gap-2"
              >
                {detectHook.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4" /> Generando narrativa y audio...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" /> Generar y reproducir
                  </>
                )}
              </Button>

              {detectHook.error && <ErrorCard message={detectHook.error} />}

              {detectHook.data && (
                <>
                  <AudioSection
                    audioAvailable={detectHook.data.audio.disponible}
                    audioBase64={detectHook.data.audio.data_base64}
                    contentType={detectHook.data.audio.content_type}
                    narrative={detectHook.data.narrativa_final}
                    ttsReason={detectHook.data.audio.razon ?? null}
                  />
                  <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                    <strong className="text-foreground">Decisión real del sistema:</strong>{' '}
                    {detectHook.data.narrativa_final}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={markResponded} className="gap-2">
                      <Timer className="w-4 h-4" />
                      Marcar momento de respuesta
                    </Button>
                    {elapsedMs !== null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {(elapsedMs / 1000).toFixed(1)} s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Repeticiones de audio solicitadas:</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setRepeticiones((n) => Math.max(0, n - 1))}>
                      -
                    </Button>
                    <span className="text-sm w-4 text-center">{repeticiones}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setRepeticiones((n) => n + 1)}>
                      +
                    </Button>
                  </div>
                </>
              )}

              {test.tipo === 'ruta' && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Dirección que indicó el participante:
                  </p>
                  <div className="flex gap-2">
                    {[
                      { v: 'izquierda', Icon: ArrowLeft, label: 'Izquierda' },
                      { v: 'frente', Icon: ArrowUp, label: 'Frente' },
                      { v: 'derecha', Icon: ArrowRight, label: 'Derecha' },
                    ].map(({ v, Icon, label }) => (
                      <button
                        key={v}
                        onClick={() => setRespuesta(v)}
                        className={cn(
                          'flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-colors',
                          respuesta === v
                            ? 'border-[#7F77DD] bg-[#EEEDFE] text-[#4B45A8]'
                            : 'border-border text-muted-foreground hover:border-[#7F77DD]/50'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm text-foreground">¿Coincide con la ruta libre real?</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={correcto === true ? 'default' : 'outline'}
                            onClick={() => setCorrecto(true)}
                          >
                            Sí
                          </Button>
                          <Button
                            size="sm"
                            variant={correcto === false ? 'default' : 'outline'}
                            onClick={() => setCorrecto(false)}
                          >
                            No
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Compara la dirección elegida contra la decisión de movimiento real del backend</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Respuesta abierta (tipo imagen no-ruta) ── */}
          {test.tipo === 'imagen' && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Respuesta del participante
              </label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={3}
                placeholder="Transcribe aquí lo que respondió el participante..."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD] resize-none"
              />
            </div>
          )}

          {/* ── Escala Likert por criterio ── */}
          {test.tipo === 'escala' && test.criterios && (
            <div className="divide-y divide-border">
              {test.criterios.map((c) => (
                <LikertRow
                  key={c}
                  label={c}
                  value={escala[c] ?? 0}
                  onChange={(v) => setEscala((prev) => ({ ...prev, [c]: v }))}
                />
              ))}
            </div>
          )}

          {/* ── Texto libre ── */}
          {test.tipo === 'texto' && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Respuesta</label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD] resize-none"
              />
            </div>
          )}

          {/* Observaciones del investigador (todas las pruebas) */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Observaciones del investigador <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Comentarios espontáneos, dudas, comportamiento del participante..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD] resize-none"
            />
          </div>

          {addResponse.error && <ErrorCard message={addResponse.error} />}

          <Button
            onClick={handleSave}
            disabled={addResponse.isLoading}
            className="w-full gap-2 bg-[#7F77DD] hover:bg-[#6B63C8] text-white"
          >
            {addResponse.isLoading ? (
              <>
                <Spinner className="w-4 h-4" /> Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Guardar respuesta
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
