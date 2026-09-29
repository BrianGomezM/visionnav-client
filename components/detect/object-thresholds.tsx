'use client'

import { Gauge } from 'lucide-react'
import type { UmbralInfo } from '@/hooks/use-detect'

const pct = (v: number) => `${Math.round(v * 100)} %`

/**
 * Objetos detectados con su confianza y el umbral que realmente se les aplicó.
 * Regla (congelada): umbral efectivo = menor entre el mínimo de la clase y el umbral de
 * Ajustes, con piso en la confianza interna de YOLO. Solo informativo.
 */
export function ObjectThresholds({ umbral }: { umbral: UmbralInfo }) {
  return (
    <section aria-labelledby="umbral-title" className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <h3 id="umbral-title" className="font-medium text-foreground flex items-center gap-2">
        <Gauge className="w-4 h-4 text-[#1D9E75]" aria-hidden="true" /> Objetos detectados y su umbral
      </h3>
      <p className="text-xs text-muted-foreground">
        Umbral de Ajustes: <strong className="text-foreground">{umbral.umbral_ajustes.toFixed(2)}</strong>. Cada clase tiene
        un mínimo propio para no omitir obstáculos importantes; el umbral de Ajustes puede bajarlo, nunca subirlo (piso{' '}
        {umbral.piso.toFixed(2)}). Por eso puede aparecer, por ejemplo, una mesa al 18 %.
      </p>
      {umbral.objetos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se detectaron objetos por encima de su umbral.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Confianza y umbral efectivo de cada objeto detectado</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th scope="col" className="py-1.5 pr-3">Objeto</th>
                <th scope="col" className="py-1.5 pr-3">Confianza</th>
                <th scope="col" className="py-1.5 pr-3">Mínimo de la clase</th>
                <th scope="col" className="py-1.5">Umbral aplicado</th>
              </tr>
            </thead>
            <tbody>
              {umbral.objetos.map((o, i) => (
                <tr key={`${o.clase}-${i}`} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 capitalize">{o.objeto}</td>
                  <td className="py-1.5 pr-3 font-mono">{pct(o.confianza)}</td>
                  <td className="py-1.5 pr-3 font-mono">{o.minimo_clase === null ? '— (usa Ajustes)' : pct(o.minimo_clase)}</td>
                  <td className="py-1.5 font-mono">{pct(o.umbral_efectivo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
