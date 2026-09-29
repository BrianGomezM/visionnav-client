'use client'

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CatalogUserTest } from '@/hooks/use-catalog'
import type { ExecutionRule } from '@/lib/study-protocol'

const TIPO_TEXTO: Record<CatalogUserTest['tipo'], string> = {
  imagen: 'Escucha la narrativa de una imagen y responde qué objetos oyó y dónde están.',
  ruta: 'Escucha la narrativa de una imagen y toma una decisión de orientación (hipotética, sin desplazarse).',
  escala: 'Valora aspectos en una escala de 1 a 5.',
  texto: 'Pregunta abierta: se anota la respuesta verbal.',
}

/** Ícono (i) de la vista del investigador: de qué trata la prueba y por qué está (o no) disponible. */
export function TestInfo({ test, rule, done }: { test: CatalogUserTest; rule: ExecutionRule; done: boolean }) {
  const estado = done
    ? 'Ya registrada como formal en esta sesión.'
    : rule.formal
      ? 'Disponible como prueba formal (cuenta como evidencia).'
      : rule.ensayo
        ? 'Solo como ensayo: se registra aparte y no cuenta como evidencia.'
        : 'Bloqueada en esta sesión.'
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`De qué trata ${test.id}`}
          className="shrink-0 rounded-full p-1.5 text-[#4B45A8] hover:bg-[#EEEDFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]"
        >
          <Info className="w-4 h-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm space-y-2">
        <p className="font-medium text-foreground">
          {test.id} · {test.nombre}
        </p>
        <p>
          <span className="text-muted-foreground">Objetivo: </span>
          {test.objetivo}
        </p>
        <p>
          <span className="text-muted-foreground">Qué hace el participante: </span>
          {TIPO_TEXTO[test.tipo]}
          {test.requiere_estimulo ? ' Requiere imagen del catálogo y audio generado por VisionNav.' : ' No usa imagen ni audio.'}
        </p>
        {test.metricas_texto.length > 0 && (
          <div>
            <p className="text-muted-foreground">Qué se mide:</p>
            <ul className="list-disc pl-5">
              {test.metricas_texto.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <p>
          <span className="text-muted-foreground">Estado: </span>
          {estado}
          {rule.motivo && !done && <> {rule.motivo}</>}
        </p>
      </PopoverContent>
    </Popover>
  )
}
