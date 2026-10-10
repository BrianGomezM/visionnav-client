'use client'

import { useId } from 'react'
import { Check, X } from 'lucide-react'
import type { DecisionDefinition, Referencia } from '@/hooks/use-catalog'
import type { Codificacion } from '@/lib/study-protocol'
import { CheckboxGroupField, RadioGroupField, inputClass } from '@/components/study/form-controls'
import { LADO_TEXTO, pasosCoinciden, type CodingState, type LadoRespuesta, type NotoCambio } from '@/lib/study-coding'
import { cn } from '@/lib/utils'

const LADO_OPTS: [LadoRespuesta, string][] = [
  ['izquierda', 'Izquierda'], ['frente', 'Al frente'], ['derecha', 'Derecha'], ['no_sabe', 'No sabe'],
]

function Result({ ok }: { ok: boolean | null }) {
  if (ok === null) return null
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0F5C47]"><Check className="w-3.5 h-3.5" aria-hidden="true" /> coincide</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B42318]"><X className="w-3.5 h-3.5" aria-hidden="true" /> no coincide</span>
  )
}

const Pregunta = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <p className="text-sm font-medium text-foreground">
    <span className="text-[#4B45A8]">Pregunta {n}.</span> {children}
  </p>
)

/**
 * Preguntas de la prueba con sus respuestas definidas de antemano según la narrativa: el
 * investigador marca lo que dijo el participante (la respuesta completa queda grabada).
 */
export function ReferenceCoder({
  codificacion,
  referencia,
  decision,
  value,
  onChange,
}: {
  codificacion: Codificacion[]
  referencia: Referencia | null | undefined
  decision: DecisionDefinition | null
  value: CodingState
  /** Recibe una función sobre el estado anterior: cada marca se aplica al estado más reciente. */
  onChange: (update: (prev: CodingState) => CodingState) => void
}) {
  const uid = useId()
  const set = (patch: (prev: CodingState) => Partial<CodingState>) => onChange((prev) => ({ ...prev, ...patch(prev) }))
  const objs = referencia?.objetos ?? []
  let n = 0

  return (
    <div className="space-y-5">
      {/* ── OBJ-01: objetos recordados ── */}
      {codificacion.includes('objetos') && (
        <section className="rounded-lg border border-border p-4 space-y-3">
          <Pregunta n={++n}>«¿Qué objetos mencionó la descripción?»</Pregunta>
          <p className="text-xs text-muted-foreground">Toque cada objeto que nombre el participante.</p>
          <div className="flex flex-wrap gap-2">
            {objs.map((o) => {
              const on = Boolean(value.nombrados[o.nombre])
              return (
                <button
                  key={o.nombre}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set((p) => ({ nombrados: { ...p.nombrados, [o.nombre]: !p.nombrados[o.nombre] } }))}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
                    on ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F5C47]' : 'border-border text-foreground'
                  )}
                >
                  <span className="font-medium">{on ? '✓ ' : ''}{o.nombre}</span>
                </button>
              )
            })}
          </div>
          <div>
            <label htmlFor={`${uid}-inv`} className="text-xs text-muted-foreground">
              Objetos que mencionó y NO estaban (opcional, separados por comas)
            </label>
            <input
              id={`${uid}-inv`}
              className={inputClass}
              value={value.inventados}
              onChange={(e) => { const v = e.target.value; set(() => ({ inventados: v })) }}
            />
          </div>
        </section>
      )}

      {/* ── OBJ-01: relación entre los objetos (p. ej. cuál está más lejos) ── */}
      {codificacion.includes('relaciones') && referencia?.relacion && (
        <section className="rounded-lg border border-border p-4 space-y-3">
          <Pregunta n={++n}>«{referencia.relacion.pregunta}»</Pregunta>
          <RadioGroupField
            legend="Lo que respondió"
            name={`${uid}-cerca`}
            options={[...objs.map((o) => [o.nombre, o.nombre] as [string, string]), ['no_sabe', 'No sabe']]}
            value={value.cercano}
            onChange={(v) => set(() => ({ cercano: v }))}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Según la descripción: <strong className="text-foreground">{referencia.relacion.respuesta}</strong>
            <Result ok={value.cercano === null ? null : value.cercano === referencia.relacion.respuesta} />
          </p>
        </section>
      )}

      {/* ── OBJ-02: dónde está cada objeto y a cuántos pasos ── */}
      {codificacion.includes('ubicacion') &&
        objs.map((o) => {
          const lado = value.lados[o.nombre] ?? null
          const dist = pasosCoinciden(value.pasos[o.nombre], o.pasos)
          return (
            <section key={o.nombre} className="rounded-lg border border-border p-4 space-y-3">
              <Pregunta n={++n}>
                «¿Dónde está {o.articulo ?? o.nombre.toLowerCase()}: a su izquierda, al frente o a su derecha?» y «¿A cuántos pasos, más o menos?»
              </Pregunta>
              <p className="text-xs text-muted-foreground">
                Según la descripción: <strong className="text-foreground">{LADO_TEXTO[o.lado]}{o.pasos !== null ? `, a ${o.pasos} pasos` : ''}</strong>
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <RadioGroupField
                    legend="Lado que dijo"
                    name={`${uid}-lado-${o.nombre}`}
                    options={LADO_OPTS}
                    value={lado}
                    onChange={(v) => set((p) => ({ lados: { ...p.lados, [o.nombre]: v } }))}
                  />
                  <Result ok={lado === null ? null : lado === o.lado} />
                </div>
                {codificacion.includes('distancia') && (
                  <div className="space-y-1">
                    <label htmlFor={`${uid}-pasos-${o.nombre}`} className="text-sm font-medium text-foreground block">
                      Pasos que dijo
                    </label>
                    <input
                      id={`${uid}-pasos-${o.nombre}`}
                      type="number"
                      min={0}
                      max={50}
                      inputMode="numeric"
                      className={cn(inputClass, 'w-24')}
                      value={value.pasos[o.nombre] ?? ''}
                      onChange={(e) => { const v = e.target.value; set((p) => ({ pasos: { ...p.pasos, [o.nombre]: v } })) }}
                    />
                    <Result ok={dist === 'no_reportada' ? null : dist === 'si'} />
                    <p className="text-[11px] text-muted-foreground">Coincide si está a ±1 paso. Vacío si no dijo pasos.</p>
                  </div>
                )}
              </div>
            </section>
          )
        })}

      {/* ── OBJ-04: cambios ── */}
      {codificacion.includes('cambio') && (
        <section className="rounded-lg border border-border p-4 space-y-3">
          <Pregunta n={++n}>«¿Notó algún cambio respecto a la descripción anterior?»</Pregunta>
          <RadioGroupField
            legend="Lo que respondió"
            name={`${uid}-noto`}
            options={[['si', 'Sí'], ['no', 'No'], ['no_responde', 'No responde']] as [NotoCambio, string][]}
            value={value.notoCambio}
            onChange={(v) => set(() => ({ notoCambio: v }))}
          />
          {value.notoCambio === 'si' && (
            <>
              <p className="text-sm text-foreground">«¿Qué cambió?»</p>
              <CheckboxGroupField
                legend="Cambios reales que mencionó"
                options={(referencia?.cambios ?? []).map((c) => [c, c] as [string, string])}
                values={value.cambios}
                onChange={(v) => set(() => ({ cambios: v }))}
              />
              <div>
                <label htmlFor={`${uid}-otro`} className="text-xs text-muted-foreground">
                  Otro cambio que mencionó (si dijo algo que no ocurrió)
                </label>
                <input id={`${uid}-otro`} className={inputClass} value={value.cambioOtro} onChange={(e) => { const v = e.target.value; set(() => ({ cambioOtro: v })) }} />
              </div>
            </>
          )}
        </section>
      )}

      {/* ── OBJ-03 / OBJ-04: por dónde avanzaría (varias) ── */}
      {decision && (
        <section className="rounded-lg border border-border p-4 space-y-3">
          <Pregunta n={++n}>«{decision.pregunta}»</Pregunta>
          <CheckboxGroupField
            legend="Direcciones que dijo (puede marcar varias)"
            options={[...decision.alternativas.map((a) => [a.id, a.texto] as [string, string]), ['no_responde', 'No responde']]}
            values={value.direcciones}
            onChange={(v) => {
              // «No responde» excluye las demás opciones.
              const nueva = v.find((x) => !value.direcciones.includes(x))
              set(() => ({ direcciones: nueva === 'no_responde' ? ['no_responde'] : v.filter((x) => x !== 'no_responde') }))
            }}
          />
        </section>
      )}
    </div>
  )
}
