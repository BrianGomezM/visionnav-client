'use client'

import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/study/form-controls'
import type { Comprendida, Comprension, SiNoReportada } from '@/lib/study-protocol'

/**
 * Codificación de la respuesta verbal (doc. 27, §H y §O):
 *  - objetos MENCIONADOS EN LA NARRATIVA (referencia): ¿los identificó? ¿dónde dijo
 *    que estaban? ¿la ubicación coincide con la narrativa?
 *  - objetos inventados por el participante (no estaban en la narrativa);
 *  - relaciones espaciales de la narrativa: ¿la comprendió?
 * Omisiones, invenciones y porcentajes los calcula el servidor.
 */
export function ComprehensionCoder({ value, onChange }: { value: Comprension; onChange: (c: Comprension) => void }) {
  const uid = useId()
  // Texto crudo de los inventados: se separa por comas al enviar (cleanComprension recorta).
  const [inventados, setInventados] = useState(() => value.objetos_inventados.join(', '))
  const setObj = (i: number, u: Partial<Comprension['objetos'][number]>) =>
    onChange({ ...value, objetos: value.objetos.map((o, j) => (j === i ? { ...o, ...u } : o)) })
  const setRel = (i: number, u: Partial<Comprension['relaciones'][number]>) =>
    onChange({ ...value, relaciones: value.relaciones.map((r, j) => (j === i ? { ...r, ...u } : r)) })

  return (
    <div className="space-y-5">
      {/* Sugerencias de posición horizontal (tarea espacial); se admite texto libre para otras relaciones. */}
      <datalist id={`${uid}-ubicaciones`}>
        <option value="izquierda" />
        <option value="centro" />
        <option value="derecha" />
      </datalist>
      {/* ── Objetos ── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Objetos mencionados en la narrativa</legend>
        <p className="text-xs text-muted-foreground">
          Una fila por objeto que la narrativa menciona (tome la lista del texto mostrado arriba).
        </p>
        {value.objetos.map((o, i) => (
          <div key={i} className="grid md:grid-cols-[1fr_auto_1fr_auto_auto] gap-2 items-end rounded-lg border border-border p-2">
            <div>
              <label htmlFor={`${uid}-o${i}`} className="text-xs text-muted-foreground block">
                Objeto {i + 1}
              </label>
              <input id={`${uid}-o${i}`} className={inputClass} value={o.objeto} onChange={(e) => setObj(i, { objeto: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input
                type="checkbox"
                className="accent-[#4B45A8]"
                checked={o.identificado}
                onChange={(e) => setObj(i, { identificado: e.target.checked })}
              />
              Lo identificó
            </label>
            <div>
              <label htmlFor={`${uid}-u${i}`} className="text-xs text-muted-foreground block">
                Ubicación que indicó
              </label>
              <input
                id={`${uid}-u${i}`}
                list={`${uid}-ubicaciones`}
                className={inputClass}
                value={o.ubicacion_reportada ?? ''}
                onChange={(e) => setObj(i, { ubicacion_reportada: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-c${i}`} className="text-xs text-muted-foreground block">
                ¿Ubicación correcta?
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
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() =>
            onChange({
              ...value,
              objetos: [...value.objetos, { objeto: '', identificado: false, ubicacion_reportada: null, ubicacion_correcta: 'no_reportada' }],
            })
          }
        >
          <Plus className="w-3 h-3" aria-hidden="true" /> Añadir objeto
        </Button>
      </fieldset>

      {/* ── Inventados ── */}
      <div>
        <label htmlFor={`${uid}-inv`} className="text-sm font-medium text-foreground block">
          Objetos que el participante mencionó y NO estaban en la narrativa
        </label>
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

      {/* ── Relaciones ── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Relaciones espaciales de la narrativa</legend>
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
    </div>
  )
}
