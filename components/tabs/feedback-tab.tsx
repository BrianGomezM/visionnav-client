'use client'

import { useState, useCallback } from 'react'
import {
  Star,
  MessageSquarePlus,
  RefreshCw,
  CheckCircle2,
  Users,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { RatingStars } from '@/components/feedback/rating-stars'
import { RatingDistribution } from '@/components/feedback/rating-distribution'
import { useFeedbackList, useSubmitFeedback } from '@/hooks/use-feedback'

interface FeedbackTabProps {
  baseUrl: string
  isActive: boolean
}

const ESCENARIOS = [
  'sala de estar',
  'cocina',
  'dormitorio',
  'baño',
  'oficina',
  'pasillo',
  'exterior',
  'otro',
]

/**
 * Pestaña de Feedback de usuarios — formulario de calificación 1–5 estrellas
 * con comentario opcional, y panel de estadísticas del feedback acumulado.
 *
 * Endpoints:
 *   POST /api/feedback — registrar calificación + comentario
 *   GET  /api/feedback — estadísticas y lista de registros
 */
export function FeedbackTab({ baseUrl, isActive }: FeedbackTabProps) {
  const feedbackList = useFeedbackList(baseUrl, isActive)
  const submitHook = useSubmitFeedback(baseUrl)

  // Estado del formulario
  const [rating, setRating] = useState(0)
  const [narrativa, setNarrativa] = useState('')
  const [comentario, setComentario] = useState('')
  const [escenario, setEscenario] = useState('')

  const handleSubmit = async () => {
    if (rating === 0) return

    const result = await submitHook.submit({
      calificacion: rating,
      narrativa_evaluada: narrativa.trim() || undefined,
      comentario: comentario.trim() || undefined,
      escenario: escenario || undefined,
    })

    if (result) {
      // Limpiar formulario y actualizar lista
      setRating(0)
      setNarrativa('')
      setComentario('')
      setEscenario('')
      feedbackList.refresh()
    }
  }

  const handleReset = useCallback(() => {
    submitHook.reset()
    setRating(0)
    setNarrativa('')
    setComentario('')
    setEscenario('')
  }, [submitHook])

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-[#F59E0B]" />
          Evaluación de usuarios
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Recoge la percepción de los usuarios sobre la utilidad de las narrativas generadas.
          Los datos se almacenan para el análisis de usabilidad de la tesis.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Formulario de feedback ── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-[#F59E0B]" />
            Nueva evaluación
          </h3>

          {/* Éxito */}
          {submitHook.success && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#E1F5EE] border border-[#1D9E75]/30">
              <CheckCircle2 className="w-5 h-5 text-[#1D9E75] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#0F6E56]">
                  ¡Gracias por tu evaluación!
                </p>
                <p className="text-xs text-[#0F6E56]/80 mt-0.5">
                  Tu calificación ha sido registrada exitosamente.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="ml-auto text-[#0F6E56] hover:text-[#0F6E56] h-7"
              >
                Nueva
              </Button>
            </div>
          )}

          {/* Calificación */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-3">
              ¿Qué tan útil fue la narrativa generada?
              <span className="text-[#E24B4A] ml-1" aria-hidden="true">*</span>
            </label>
            <RatingStars value={rating} onChange={setRating} size="lg" />
            {rating === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Selecciona una calificación para continuar
              </p>
            )}
          </div>

          {/* Narrativa evaluada (opcional) */}
          <div>
            <label
              htmlFor="narrativa"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Narrativa evaluada
              <span className="text-xs text-muted-foreground font-normal ml-2">(opcional)</span>
            </label>
            <textarea
              id="narrativa"
              value={narrativa}
              onChange={(e) => setNarrativa(e.target.value)}
              placeholder="Pega aquí el texto de la narrativa que estás evaluando..."
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F59E0B] resize-none"
            />
          </div>

          {/* Tipo de escenario */}
          <div>
            <label
              htmlFor="escenario-fb"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Tipo de escenario
              <span className="text-xs text-muted-foreground font-normal ml-2">(opcional)</span>
            </label>
            <select
              id="escenario-fb"
              value={escenario}
              onChange={(e) => setEscenario(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            >
              <option value="">— No especificar —</option>
              {ESCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Comentario */}
          <div>
            <label
              htmlFor="comentario"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Comentario u observación
              <span className="text-xs text-muted-foreground font-normal ml-2">(máx. 1000 caracteres)</span>
            </label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 1000))}
              placeholder="¿Qué mejorarías? ¿Fue precisa la descripción del entorno?"
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F59E0B] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {comentario.length}/1000
            </p>
          </div>

          {submitHook.error && <ErrorCard message={submitHook.error} />}

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitHook.isLoading || submitHook.success}
            className="w-full gap-2"
            style={{ backgroundColor: '#F59E0B', color: 'white' }}
          >
            {submitHook.isLoading ? (
              <>
                <Spinner className="w-4 h-4" />
                Enviando evaluación...
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                Enviar evaluación
              </>
            )}
          </Button>
        </div>

        {/* ── Estadísticas de feedback ── */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                Resumen de evaluaciones
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={feedbackList.refresh}
                disabled={feedbackList.isLoading}
                className="gap-1 h-7 px-2 text-xs"
              >
                <RefreshCw
                  className={`w-3 h-3 ${feedbackList.isLoading ? 'animate-spin' : ''}`}
                />
                Actualizar
              </Button>
            </div>

            {feedbackList.isLoading && !feedbackList.data && (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-[#F59E0B]" />
              </div>
            )}

            {feedbackList.error && <ErrorCard message={feedbackList.error} />}

            {feedbackList.data && feedbackList.data.total === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no hay evaluaciones registradas. ¡Sé el primero en evaluar!
              </p>
            )}

            {feedbackList.data && feedbackList.data.total > 0 && feedbackList.data.estadisticas && (
              <>
                {/* Resumen numérico */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#F59E0B]">
                      {feedbackList.data.estadisticas.promedio.toFixed(1)}
                    </p>
                    <RatingStars
                      value={Math.round(feedbackList.data.estadisticas.promedio)}
                      onChange={() => {}}
                      readonly
                      size="sm"
                    />
                  </div>
                  <div className="border-l border-border pl-4">
                    <p className="text-sm text-muted-foreground">Promedio de</p>
                    <p className="text-2xl font-bold text-foreground">
                      {feedbackList.data.total}
                    </p>
                    <p className="text-sm text-muted-foreground">evaluaciones</p>
                  </div>
                </div>

                {/* Distribución */}
                <RatingDistribution
                  distribucion={feedbackList.data.estadisticas.distribucion}
                  total={feedbackList.data.total}
                />
              </>
            )}
          </div>

          {/* Últimas evaluaciones */}
          {feedbackList.data && feedbackList.data.total > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#F59E0B]" />
                Últimas evaluaciones
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {feedbackList.data.registros
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-muted/20 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <RatingStars
                          value={r.calificacion}
                          onChange={() => {}}
                          readonly
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.timestamp).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {r.narrativa_evaluada && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2">
                          «{r.narrativa_evaluada}»
                        </p>
                      )}
                      {r.comentario && (
                        <p className="text-xs text-foreground">{r.comentario}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {r.escenario && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[#FEF3C7] text-[#92400E]">
                            {r.escenario}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Nota académica */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Escala Likert:</strong> Las evaluaciones
              usan una escala de 1 a 5 (1 = muy poco útil, 5 = muy útil). Los datos
              se persisten en{' '}
              <code className="font-mono bg-muted px-1 rounded text-[10px]">
                feedback_data/feedback.json
              </code>{' '}
              para análisis estadístico de usabilidad en la tesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
