'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/study/form-controls'
import { FieldInfo } from '@/components/study/field-info'
import { FIELD_HELP } from '@/lib/study-help'
import { codedObjectName, narratedLocation, narratedSteps, parseNarrative, type Ubicacion } from '@/lib/narrative-parse'
import { cn } from '@/lib/utils'
import type { Codificacion, Comprendida, Comprension, SiNoReportada } from '@/lib/study-protocol'

const QUICK: [Ubicacion, string][] = [['izquierda', 'Izquierda'], ['centro', 'Centro / frente'], ['derecha', 'Derecha']]

/**
 * Codificación de la respuesta verbal frente a la NARRATIVA escuchada (doc. 27, §H y §O).
 * Solo se muestra lo que la prueba pregunta (catálogo → codificacion):
 *  - objetos:    ¿nombró cada objeto de la narrativa? + objetos inventados (OBJ-01);
 *  - relaciones: ¿comprendió la relación entre objetos? (OBJ-01);
 *  - ubicacion:  ¿el lado que dijo coincide con la narrativa? (OBJ-02);
 *  - distancia:  ¿la distancia que dijo coincide con la narrativa? (OBJ-02).
 * Omisiones, invenciones y porcentajes los calcula el servidor.
 */
export function ComprehensionCoder({
  value,
  onChange,
  narrative,
  codificacion,
}: {
  value: Comprension
  onChange: (c: Comprension) => void
  narrative?: string | null
  codificacion: Codificacion[]
}) {
  const uid = useId()
  const show = (c: Codificacion) => codificacion.includes(c)
  const objetosVisibles = show('objetos') || show('ubicacion') || show('distancia')
  // Texto crudo de los inventados: se separa por comas al enviar (cleanComprension recorta).
  const [inventados, setInventados] = useState(() => value.objetos_inventados.join(', '))
  const setObj = (i: number, u: Partial<Comprension['objetos'][number]>) =>
    onChange({ ...value, objetos: value.objetos.map((o, j) => (j === i ? { ...o, ...u } : o)) })
  const setRel = (i: number, u: Partial<Comprension['relaciones'][number]>) =>
    onChange({ ...value, relaciones: value.relaciones.map((r, j) => (j === i ? { ...r, ...u } : r)) })

  const loadFromNarrative = () => {
    if (!narrative) return
    const p = parseNarrative(narrative)
    onChange({
      ...value,
      objetos: objetosVisibles
        ? p.objetos.map((o) => ({
            objeto: codedObjectName(o),
            identificado: false,
            ubicacion_reportada: null,
            ubicacion_correcta: 'no_reportada' as SiNoReportada,
            distancia_reportada: null,
            distancia_correcta: 'no_reportada' as SiNoReportada,
          }))
        : [],
      relaciones: show('relaciones') ? p.relaciones.map((r) => ({ relacion: r, respuesta: null, comprendida: 'no_evaluada' as Comprendida })) : [],
    })
  }

  // Ubicación rápida: la correcta se propone comparando con lo que dijo la narrativa.
  const quickLocation = (i: number, loc: Ubicacion) => {
    const narrated = narratedLocation(value.objetos[i].objeto)
    setObj(i, {
      ubicacion_reportada: loc,
      ubicacion_correcta: narrated ? (narrated === loc ? 'si' : 'no') : value.objetos[i].ubicacion_correcta,
    })
  }

  // Se precarga sola la primera vez (el investigador solo revisa y marca).
  const preloaded = useRef(false)
  useEffect(() => {
    if (preloaded.current || !narrative || value.objetos.length || value.relaciones.length) return
    preloaded.current = true
    loadFromNarrative()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrative])

  return (
    <div className="space-y-5">
      {narrative && (
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={loadFromNarrative}>
          <Wand2 className="w-4 h-4" aria-hidden="true" /> {value.objetos.length || value.relaciones.length ? 'Volver a cargar' : 'Cargar'}{' '}
          {show('relaciones') ? 'objetos y relaciones' : 'objetos'} de la narrativa
        </Button>
      )}

      {objetosVisibles && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            {show('objetos') ? 'Objetos mencionados en la narrativa' : 'Objeto preguntado'}
            <FieldInfo help={show('objetos') ? FIELD_HELP.objetos : FIELD_HELP.ubicacion} />
          </legend>
          {value.objetos.length === 0 && (
            <p className="text-xs text-muted-foreground">Cárguelos de la narrativa o añádalos uno por uno.</p>
          )}
          {value.objetos.map((o, i) => {
            const narrated = narratedLocation(o.objeto)
            const pasos = narratedSteps(o.objeto)
            return (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <div>
                    <label htmlFor={`${uid}-o${i}`} className="text-xs text-muted-foreground block">
                      Objeto {i + 1}
                      {narrated && ` · la narrativa dijo: ${narrated}`}
                      {pasos !== null && `, unos ${pasos} pasos`}
                    </label>
                    <input id={`${uid}-o${i}`} className={inputClass} value={o.objeto} onChange={(e) => setObj(i, { objeto: e.target.value })} />
                  </div>
                  {show('objetos') ? (
                    <label className="flex items-center gap-2 text-sm pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-[#4B45A8] w-4 h-4"
                        checked={o.identificado}
                        onChange={(e) => setObj(i, { identificado: e.target.checked })}
                      />
                      Lo nombró
                    </label>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar objeto ${i + 1}`}
                    onClick={() => onChange({ ...value, objetos: value.objetos.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
                {show('ubicacion') && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div role="group" aria-label={`Dónde dijo que estaba el objeto ${i + 1}`} className="flex flex-wrap gap-1.5">
                      {QUICK.map(([loc, text]) => (
                        <button
                          key={loc}
                          type="button"
                          aria-pressed={o.ubicacion_reportada === loc}
                          onClick={() => quickLocation(i, loc)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]',
                            o.ubicacion_reportada === loc ? 'border-[#4B45A8] bg-[#4B45A8] text-white' : 'border-border'
                          )}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-40">
                      <label htmlFor={`${uid}-u${i}`} className="text-xs text-muted-foreground block">
                        Ubicación que indicó (texto libre)
                      </label>
                      <input
                        id={`${uid}-u${i}`}
                        className={inputClass}
                        value={o.ubicacion_reportada ?? ''}
                        onChange={(e) => setObj(i, { ubicacion_reportada: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-c${i}`} className="text-xs text-muted-foreground block">
                        ¿Coincide con la narrativa?
                      </label>
                      <select
                        id={`${uid}-c${i}`}
                        className={inputClass}
                        value={o.ubicacion_correcta}
                        onChange={(e) => setObj(i, { ubicacion_correcta: e.target.value as SiNoReportada })}
                      >
                        <option value="no_reportada">No la indicó</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                )}
                {show('distancia') && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-40">
                      <label htmlFor={`${uid}-d${i}`} className="text-xs text-muted-foreground block">
                        Distancia que indicó (texto libre)
                      </label>
                      <input
                        id={`${uid}-d${i}`}
                        className={inputClass}
                        value={o.distancia_reportada ?? ''}
                        onChange={(e) => setObj(i, { distancia_reportada: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-dc${i}`} className="text-xs text-muted-foreground block">
                        ¿La distancia coincide con la narrativa?
                      </label>
                      <select
                        id={`${uid}-dc${i}`}
                        className={inputClass}
                        value={o.distancia_correcta ?? 'no_reportada'}
                        onChange={(e) => setObj(i, { distancia_correcta: e.target.value as SiNoReportada })}
                      >
                        <option value="no_reportada">No la indicó</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <FieldInfo help={FIELD_HELP.distancia} />
                  </div>
                )}
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              onChange({
                ...value,
                objetos: [
                  ...value.objetos,
                  { objeto: '', identificado: false, ubicacion_reportada: null, ubicacion_correcta: 'no_reportada', distancia_reportada: null, distancia_correcta: 'no_reportada' },
                ],
              })
            }
          >
            <Plus className="w-3 h-3" aria-hidden="true" /> Añadir objeto
          </Button>
        </fieldset>
      )}

      {show('objetos') && (
        <div>
          <div className="flex items-center">
            <label htmlFor={`${uid}-inv`} className="text-sm font-medium text-foreground">
              Objetos que el participante mencionó y NO estaban en la narrativa
            </label>
            <FieldInfo help={FIELD_HELP.inventados} />
          </div>
          <input
            id={`${uid}-inv`}
            className={inputClass}
            aria-describedby={`${uid}-inv-hint`}
            value={inventados}
            onChange={(e) => {
              setInventados(e.target.value)
              onChange({ ...value, objetos_inventados: e.target.value.split(',') })
            }}
          />
          <p id={`${uid}-inv-hint`} className="text-xs text-muted-foreground mt-1">
            Separados por comas. Vacío si no mencionó ninguno.
          </p>
        </div>
      )}

      {show('relaciones') && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Relaciones espaciales de la narrativa
            <FieldInfo help={FIELD_HELP.relaciones} />
          </legend>
          {value.relaciones.length === 0 && (
            <p className="text-xs text-muted-foreground">La narrativa no tiene relaciones entre objetos, o no se han cargado.</p>
          )}
          {value.relaciones.map((r, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end rounded-lg border border-border p-2">
              <div>
                <label htmlFor={`${uid}-r${i}`} className="text-xs text-muted-foreground block">
                  Relación {i + 1} (según la narrativa)
                </label>
                <input id={`${uid}-r${i}`} className={inputClass} value={r.relacion} onChange={(e) => setRel(i, { relacion: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`${uid}-rr${i}`} className="text-xs text-muted-foreground block">
                  Lo que respondió
                </label>
                <input
                  id={`${uid}-rr${i}`}
                  className={inputClass}
                  value={r.respuesta ?? ''}
                  onChange={(e) => setRel(i, { respuesta: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-rc${i}`} className="text-xs text-muted-foreground block">
                  ¿Comprendida?
                </label>
                <select
                  id={`${uid}-rc${i}`}
                  className={inputClass}
                  value={r.comprendida}
                  onChange={(e) => setRel(i, { comprendida: e.target.value as Comprendida })}
                >
                  <option value="no_evaluada">No evaluada</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar relación ${i + 1}`}
                onClick={() => onChange({ ...value, relaciones: value.relaciones.filter((_, j) => j !== i) })}
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
            onClick={() => onChange({ ...value, relaciones: [...value.relaciones, { relacion: '', respuesta: null, comprendida: 'no_evaluada' }] })}
          >
            <Plus className="w-3 h-3" aria-hidden="true" /> Añadir relación
          </Button>
        </fieldset>
      )}
    </div>
  )
}
