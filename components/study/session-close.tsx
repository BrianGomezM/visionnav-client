'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import {
  LikertField,
  RadioGroupField,
  TextAreaField,
  primaryButtonClass,
} from '@/components/study/form-controls'
import { ANCLAS_TEXTO, EMPTY_ESCALAS, ESCALAS, cleanEscalas, type Escalas } from '@/lib/study-protocol'
import { SCALE_HELP } from '@/lib/study-help'

type Motivo = 'completada' | 'retiro_participante' | 'interrumpida_tecnica'

/**
 * Cierre de la sesión: cuestionario posterior breve (solo claridad y esfuerzo: lo demás
 * ya se preguntó en OBJ-05/06/07), notas de la entrevista semiestructurada breve y
 * registro técnico (incluye lo que antes era PIL-03). Después la sesión no admite
 * respuestas nuevas.
 */
export function SessionClose({
  isLoading,
  error,
  pendingTests,
  onClose,
  onCancel,
}: {
  isLoading: boolean
  error: string | null
  pendingTests: string[]
  onClose: (payload: unknown) => void
  onCancel: () => void
}) {
  const [motivo, setMotivo] = useState<Motivo>('completada')
  const [escalas, setEscalas] = useState<Escalas>(EMPTY_ESCALAS)
  const [comentarios, setComentarios] = useState('')
  const [entrevista, setEntrevista] = useState('')
  const [incidencias, setIncidencias] = useState('')
  const [observaciones, setObservaciones] = useState('')

  return (
    <section aria-labelledby="close-title" className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <h3 id="close-title" className="font-medium flex items-center gap-2">
        <Flag className="w-4 h-4 text-[#4B45A8]" aria-hidden="true" /> Finalizar sesión
      </h3>
      {pendingTests.length > 0 && (
        <p role="note" className="text-sm text-[#7A2E0E] bg-[#FFFAEB] rounded-lg p-3">
          Pruebas formales sin registrar en esta sesión: {pendingTests.join(', ')}.
        </p>
      )}
      <RadioGroupField
        legend="Motivo del cierre"
        name="motivo"
        options={[
          ['completada', 'Sesión completada'],
          ['retiro_participante', 'El participante se retiró'],
          ['interrumpida_tecnica', 'Interrumpida por un problema técnico'],
        ]}
        value={motivo}
        onChange={setMotivo}
      />
      <fieldset className="rounded-lg border border-border p-4">
        <legend className="text-sm font-medium px-1">Cuestionario posterior (1–5)</legend>
        <p className="text-xs text-muted-foreground">
          Lea la pregunta y las cinco opciones: {ANCLAS_TEXTO}. Naturalidad, suficiencia, redundancia y utilidad ya se
          preguntaron en OBJ-05, OBJ-06 y OBJ-07.
        </p>
        {ESCALAS.map((e) => (
          <LikertField
            key={e.key}
            label={e.label}
            hint={SCALE_HELP[e.key]?.pregunta ? `«${SCALE_HELP[e.key].pregunta}»` : e.ayuda}
            info={SCALE_HELP[e.key]}
            value={escalas[e.key]}
            onChange={(v) => setEscalas((p) => ({ ...p, [e.key]: v }))}
          />
        ))}
        <TextAreaField label="Comentarios del cuestionario" value={comentarios} onChange={setComentarios} rows={2} />
      </fieldset>
      <TextAreaField
        label="Entrevista semiestructurada breve (notas)"
        value={entrevista}
        onChange={setEntrevista}
        rows={4}
        hint="Qué resultó confuso, qué faltó o sobró, sugerencias. Sin nombres."
      />
      <TextAreaField
        label="Registro técnico: incidencias"
        value={incidencias}
        onChange={setIncidencias}
        rows={2}
        hint="Fallas observadas en toda la sesión (audio que no carga, demoras, errores visibles), aunque el participante no las mencione."
      />
      <TextAreaField label="Observaciones generales" value={observaciones} onChange={setObservaciones} rows={2} />
      {error && <ErrorCard message={error} />}
      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onCancel}>
          Volver a las pruebas
        </Button>
        <Button
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() =>
            onClose({
              motivo,
              cuestionario_posterior: { escalas: cleanEscalas(escalas) ?? {}, comentarios: comentarios.trim() || null },
              entrevista: entrevista.trim() || null,
              incidencias_tecnicas: incidencias.trim() || null,
              observaciones_generales: observaciones.trim() || null,
            })
          }
        >
          {isLoading ? <Spinner className="w-4 h-4" /> : null} Finalizar sesión
        </Button>
      </div>
    </section>
  )
}
