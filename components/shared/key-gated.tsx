'use client'

import type { ReactNode } from 'react'
import { ResearcherKeyGate } from '@/components/study/researcher-key-gate'
import { ErrorCard } from '@/components/shared/error-card'
import { useResearcherGate } from '@/hooks/use-researcher-gate'

/**
 * Muestra el módulo solo con la clave del investigador válida (como Evaluación con
 * usuarios y Métricas). Sin clave, o con una rechazada por el servidor, se pide la clave.
 */
export function KeyGated({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  // Siempre activo: si dependiera de la pestaña visible, el módulo se desmontaría al cambiar de pestaña.
  const state = useResearcherGate(baseUrl)
  if (state === 'allowed') return <>{children}</>
  if (state === 'checking')
    return (
      <p role="status" className="py-16 text-center text-sm text-muted-foreground">
        Verificando la clave…
      </p>
    )
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {state === 'invalid' && <ErrorCard message="El servidor rechazó la clave. Revise la clave en Ajustes." />}
      <ResearcherKeyGate />
    </div>
  )
}
