'use client'

import { useState } from 'react'
import { Flag, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { LikertField, RadioGroupField, TextAreaField, primaryButtonClass } from '@/components/study/form-controls'
import { ResponseRecorder } from '@/components/study/participant-recorder'
import { ANCLAS_TEXTO, EMPTY_ESCALAS, ESCALAS, cleanEscalas, type Escalas, type Sesion } from '@/lib/study-protocol'
import { SCALE_HELP } from '@/lib/study-help'

type Motivo = 'completada' | 'retiro_participante' | 'interrumpida_tecnica'

const MOTIVOS: [Motivo, string][] = [
  ['completada', 'Sesión completada'],
  ['retiro_participante', 'El participante se retiró'],
  ['interrumpida_tecnica', 'Interrumpida por un problema técnico'],
]

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',', 2)[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/**
 * Cierre de la sesión, al final de las pruebas (estudio v2): dos preguntas con escala
 * (facilidad y esfuerzo), preguntas abiertas cuya respuesta queda grabada, el motivo del
 * cierre y el agradecimiento. Después de finalizar, el cierre se puede corregir.
 */
export function SessionClose({
  sesion,
  isLoading,
  error,
  pendingTests,
  onClose,
}: {
  sesion: Sesion
  isLoading: boolean
  error: string | null
  pendingTests: string[]
  onClose: (payload: unknown) => Promise<boolean>
}) {
  const previo = sesion.cierre
  const [editing, setEditing] = useState(false)
  const [motivo, setMotivo] = useState<Motivo>((previo?.motivo as Motivo) ?? 'completada')
  const [escalas, setEscalas] = useState<Escalas>({ ...EMPTY_ESCALAS, ...(previo?.cuestionario_posterior?.escalas ?? {}) })
  const [comentarios, setComentarios] = useState(previo?.cuestionario_posterior?.comentarios ?? '')
  const [recording, setRecording] = useState<Blob | null>(null)

  if (previo && !editing) {
    const e = previo.cuestionario_posterior?.escalas
    return (
      <section className="rounded-xl border border-[#1D9E75]/40 bg-[#E1F5EE] p-6 space-y-2 text-sm text-[#0F5C47]">
        <p className="font-medium flex items-center gap-2">
          <Flag className="w-4 h-4" aria-hidden="true" /> Sesión finalizada · {MOTIVOS.find(([k]) => k === previo.motivo)?.[1] ?? previo.motivo}
          {previo.editado_en ? ' (cierre corregido)' : ''}
        </p>
        <p>
          Facilidad para entender: {e?.claridad ?? '—'} · Esfuerzo: {e?.carga_percibida ?? '—'}
        </p>
        <p>Grabación de los comentarios finales: {previo.grabacion ? 'guardada' : 'no hay'}</p>
        {previo.cuestionario_posterior?.comentarios && <p>Notas: {previo.cuestionario_posterior.comentarios}</p>}
        <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
          <Pencil className="w-4 h-4" aria-hidden="true" /> Editar cierre
        </Button>
      </section>
    )
  }

  const submit = async () => {
    const payload: Record<string, unknown> = {
      motivo,
      cuestionario_posterior: { escalas: cleanEscalas(escalas) ?? {}, comentarios: comentarios.trim() || null },
      entrevista: null,
      incidencias_tecnicas: null,
      observaciones_generales: null,
      editar: Boolean(previo),
    }
    if (recording) {
      payload.grabacion = { content_type: recording.type || 'audio/webm', data_base64: await blobToBase64(recording) }
    }
    const ok = await onClose(payload)
    if (ok) {
      setEditing(false)
      setRecording(null)
    }
  }

  return (
    <section aria-labelledby="close-title" className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <h3 id="close-title" className="font-medium flex items-center gap-2">
        <Flag className="w-4 h-4 text-[#4B45A8]" aria-hidden="true" /> {previo ? 'Editar el cierre' : 'Cierre y comentarios finales'}
      </h3>
      {pendingTests.length > 0 && !previo && (
        <p role="note" className="text-sm text-[#7A2E0E] bg-[#FFFAEB] rounded-lg p-3">
          Pruebas sin registrar en esta sesión: {pendingTests.join(', ')}.
        </p>
      )}

      <p className="text-sm rounded-lg bg-[#EEEDFE] text-[#2E2A6B] p-3">
        Diga: «Ya terminamos los audios. Para cerrar, le haré unas preguntas cortas.»
      </p>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="text-sm font-medium px-1">Preguntas con escala del 1 al 5</legend>
        <p className="text-xs text-muted-foreground">Lea siempre las opciones: {ANCLAS_TEXTO}.</p>
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
      </fieldset>

      <section className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Comentarios finales (se graban)</p>
        <p className="text-xs text-muted-foreground">Pulse «Grabar respuesta» y haga estas preguntas, una por una:</p>
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li>«¿Cómo se sintió durante la actividad?»</li>
          <li>«¿Qué opina de las descripciones que escuchó?»</li>
          <li>«¿Qué nos sugiere para mejorarlas?»</li>
          <li>«¿Quiere agregar algo más?»</li>
        </ol>
        <ResponseRecorder onStart={() => undefined} onChange={setRecording} />
        {previo?.grabacion && !recording && (
          <p className="text-xs text-muted-foreground">Ya hay una grabación guardada; si graba otra, la reemplaza.</p>
        )}
        <TextAreaField label="Notas (opcional)" value={comentarios} onChange={setComentarios} rows={2} hint="Solo si quiere anotar algo; la respuesta queda grabada." />
      </section>

      <RadioGroupField legend="Motivo del cierre" name="motivo" options={MOTIVOS} value={motivo} onChange={setMotivo} />

      <p className="text-sm rounded-lg bg-[#EEEDFE] text-[#2E2A6B] p-3">
        Diga: «Muchas gracias por su tiempo y por su ayuda. Sus respuestas nos sirven para mejorar el sistema. ¿Tiene alguna pregunta?»
      </p>

      {error && <ErrorCard message={error} />}
      <div className="flex flex-wrap gap-2">
        {previo && (
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancelar edición
          </Button>
        )}
        <Button disabled={isLoading} className={`flex-1 gap-2 ${primaryButtonClass}`} onClick={submit}>
          {isLoading ? <Spinner className="w-4 h-4" /> : <Flag className="w-4 h-4" aria-hidden="true" />}
          {previo ? 'Guardar corrección del cierre' : 'Finalizar sesión'}
        </Button>
      </div>
    </section>
  )
}
